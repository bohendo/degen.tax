import {
  AddressBook,
  AddressCategories,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSource,
} from "@valuemachine/types";
import {
  rmDups,
  setAddressCategory,
} from "@valuemachine/utils";

export const aaveSource = "Aave";

const govAddresses = [
  { name: "AAVE", address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9" },
].map(setAddressCategory(AddressCategories.ERC20));

const v1MarketAddresses = [
  { name: "aETH", address: "0x3a3a65aab0dd2a17e3f1947ba16138cd37d08c04" },
  { name: "aDAI", address: "0xfc1e690f61efd961294b3e1ce3313fbd8aa4f85d" },
  { name: "LendingPool", address: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9" },
  // TODO: add some more Aave contract addresses
  // v1: https://docs.aave.com/developers/v/1.0/deployed-contracts/deployed-contract-instances
  // v2: https://docs.aave.com/developers/deployed-contracts/deployed-contracts
].map(setAddressCategory(AddressCategories.Defi));

const v2MarketAddresses = [
  { name: "aDAI", address: "0x028171bca77440897b824ca71d1c56cac55b68a3" },
  { name: "aAAVE", address: "0xffc97d72e13e01096502cb8eb52dee56f74dad7b" },
  { name: "aBAT", address: "0x05ec93c0365baaeabf7aeffb0972ea7ecdd39cf1" },
].map(setAddressCategory(AddressCategories.Defi));

export const aaveAddresses = [
  ...govAddresses,
  ...v1MarketAddresses,
  ...v2MarketAddresses,
];

////////////////////////////////////////
/// Parser

export const aaveParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  _addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: aaveSource });

  log.info(`Parser activated`);

  if (aaveAddresses.some(entry => ethTx.from === entry.address)) {
    tx.sources = rmDups([aaveSource, ...tx.sources]) as TransactionSource[];
  }

  // Incorporating aave adapter

  return tx;
};
