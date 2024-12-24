import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPublicClient, http, defineChain } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { entryPoint06Address } from "viem/account-abstraction";

const chain = defineChain({
	id: 80451,
	name: "Geo Genesis",
	nativeCurrency: {
		name: "The Graph",
		symbol: "GRT",
		decimals: 18,
	},
	rpcUrls: {
		default: {
			http: [],
		},
	},
});

if (!process.env.PINAX_API_KEY || !process.env.PIMLICO_API_KEY) {
	console.log("Missing env PINAX_API_KEY or PIMLICO_API_KEY");
	process.exit(0);
}

export const publicClient = createPublicClient({
	chain,
	transport: http(
		`https://geo.rpc.pinax.network/v1/${process.env.PINAX_API_KEY}/`,
	),
});

const pimlicoUrl = `https://api.pimlico.io/v2/${chain.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;

const pimlicoClient = createPimlicoClient({
	chain,
	transport: http(pimlicoUrl),
	entryPoint: {
		address: entryPoint06Address,
		version: "0.6",
	},
});

const main = async () => {
	const account = await toSafeSmartAccount({
		client: publicClient,
		// Generating fake pk for demo purposes.
		owners: [privateKeyToAccount(generatePrivateKey())],
		entryPoint: {
			address: entryPoint06Address,
			version: "0.6",
		},
		version: "1.4.1",
		safe4337ModuleAddress: "0x57A0992199c0c6F88f8157BeC23d3073C7cf6c41",
		safeProxyFactoryAddress: "0x8DC49E8da66F000F3C22e370C550d8DCBE307f4f",
		safeSingletonAddress: "0xcb569c7E72C726Af05a2102A88aB2a83B8fF9183",
		safeModuleSetupAddress: "0x06a468dBBa33F2cD1cCDb90fCe8Ec584A1E33D36",
		multiSendAddress: "0x1a69e3b3ED6AeBCc3c90D88d424A7F42EC21504b",
		multiSendCallOnlyAddress: "0xEb280e0C02Ca6B24A1Fc1111944f1Ce37f0aCe3a",
	});

	const smartAccountClient = createSmartAccountClient({
		account,
		chain,
		bundlerTransport: http(pimlicoUrl),
		paymaster: pimlicoClient,
		userOperation: {
			estimateFeesPerGas: async () => {
				return (await pimlicoClient.getUserOperationGasPrice()).fast;
			},
		},
	});

	const hash = await smartAccountClient.sendTransaction({
		calls: [
			{
				to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
				value: 0n,
				data: "0x1234",
			},
		],
	});

	console.log(`UserOperation included in tx: ${hash}`);
};

main();
