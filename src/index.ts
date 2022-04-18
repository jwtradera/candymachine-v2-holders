import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import bs58 from 'bs58';
import { argv } from 'process';

const connection = new Connection("mainnetbeta");
const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const CANDY_MACHINE_V2_PROGRAM = new PublicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ');

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_CREATOR_LIMIT = 5;
const MAX_DATA_SIZE = 4 + MAX_NAME_LENGTH + 4 + MAX_SYMBOL_LENGTH + 4 + MAX_URI_LENGTH + 2 + 1 + 4 + MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
const CREATOR_ARRAY_START = 1 + 32 + 32 + 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH + 4 + MAX_SYMBOL_LENGTH + 2 + 1 + 4;


const getMintAddresses = async (firstCreatorAddress: PublicKey) => {

    // V2
    const metadataAccounts = await connection.getProgramAccounts(
        TOKEN_METADATA_PROGRAM,
        {
            dataSlice: { offset: 33, length: 32 },

            filters: [
                { dataSize: MAX_METADATA_LEN },
                {
                    memcmp: {
                        offset: CREATOR_ARRAY_START,
                        bytes: firstCreatorAddress.toBase58(),
                    },
                },
            ],
        },
    );

    return metadataAccounts.map((metadataAccountInfo) => (
        bs58.encode(metadataAccountInfo.account.data)
    ));
};

const getTokenHolder = async (tokenId: string) => {

    const accounts = await connection.getTokenLargestAccounts(new PublicKey(tokenId));
    if (accounts.value[0]) {
        const accountAddress = accounts.value[0].address;
        const accountInfo = await connection.getParsedAccountInfo(accountAddress);
        return (accountInfo.value.data as ParsedAccountData).parsed.info.owner;
    }

    return '-';

};

const getCandyMachineCreator = async (candyMachineId: PublicKey): Promise<[PublicKey, number]> => (
    PublicKey.findProgramAddress(
        [Buffer.from('candy_machine'), candyMachineId.toBuffer()],
        CANDY_MACHINE_V2_PROGRAM,
    )
);

(async () => {

    const candymachineId = argv[2];
    if (!candymachineId) {
        console.log('You need to input candymachine Id...');
        return;
    }
    console.log("Program Id:", candymachineId);

    const candymachinPubkey = new PublicKey(candymachineId);
    const candyMachineCreator = await getCandyMachineCreator(candymachinPubkey);
    if (!candyMachineCreator[0]) {
        console.log('Your program id not valid...');
        return;
    }

    const creatorKey = candyMachineCreator[0];
    console.log("Candymachine creator:", creatorKey.toString());

    const tokenIds = await getMintAddresses(creatorKey);
    console.log('Total tokens:', tokenIds.length);

    for (const tokenId of tokenIds) {
        const walletAddr = await getTokenHolder(tokenId);
        console.log(tokenId + ':', walletAddr);
    }

})();