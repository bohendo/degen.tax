import { appAddresses, ethParsers, Guards } from "@degentax/adapters";
import { getAddress, isAddress as isEthAddress } from "@ethersproject/address";
import { fromBech32 } from "@harmony-js/crypto";
import { AddressBook } from "@valuemachine/types";
import { getAddressBookError, getLogger } from "@valuemachine/utils";
import express from "express";
import { getAddressBook, getChainData } from "valuemachine";

import { env } from "./env";
import { getPollerHandler } from "./poller";
import { getLogAndSend, store, STATUS_YOUR_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Transactions" });

const chainData = getChainData({ etherscanKey: env.etherscanKey, logger: log, store });
const handlePoller = getPollerHandler(
  chainData.syncAddressBook,
  (addressBook: AddressBook) => chainData.getTransactions(addressBook, ethParsers),
  Guards.ETH,
);

const getEthAddress = (address: string) => {
  if (address.startsWith("one")) {
    return fromBech32(address);
  } else {
    return getAddress(address);
  }
};

export const ethereumRouter = express.Router();

ethereumRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const addressBookJson = req.body.addressBook.map(e => ({
    ...e,
    address: getEthAddress(e.address),
  }));
  const addressBookError = getAddressBookError(addressBookJson);
  if (addressBookError) {
    return logAndSend("Invalid AddressBook" + addressBookError, STATUS_YOUR_BAD);
  }
  const addressBook = getAddressBook({
    json: addressBookJson,
    hardcoded: appAddresses,
    logger: log,
  });
  await handlePoller(
    addressBook,
    addressBook.json.map(entry => entry.address).filter(addressBook.isSelf).filter(isEthAddress),
    res,
  );
});
