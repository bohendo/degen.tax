import { appAddresses } from "@degenfolio/adapters";
import AppBar from "@material-ui/core/AppBar";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import { makeStyles } from "@material-ui/core/styles";
import TabContext from "@material-ui/lab/TabContext";
import TabPanel from "@material-ui/lab/TabPanel";
// Icons
import AccountIcon from "@material-ui/icons/AccountCircle";
import BarChartIcon from "@material-ui/icons/BarChart";
// ValueMachine
import {
  Asset,
  Assets,
  StoreKeys,
} from "@valuemachine/types";
import { chrono, getLogger, getLocalStore } from "@valuemachine/utils";
import axios from "axios";
import React, { useState, useEffect } from "react";
import { getAddressBook, getTransactions, getValueMachine, getPrices } from "valuemachine";

import { getEmptyCsv } from "../constants";
import { fetchPriceForAssetsOnDate, fetchPricesForChunks } from "../utils";

import { AddressBookManager } from "./AddressBook";
import { NavBar } from "./NavBar";
import { Portfolio } from "./Portfolio";

const useStyles = makeStyles( theme => ({
  appbar: {
    flex: 1,
    bottom: 0,
    top: "auto",
  },
  panel: {
    marginTop: theme.spacing(8),
  },
}));

const store = getLocalStore(localStorage);
const logger = getLogger("warn");

// localstorage keys
const {
  AddressBook: AddressBookStore,
  Transactions: TransactionsStore,
  ValueMachine: ValueMachineStore,
  Prices: PricesStore,
} = StoreKeys;
const UnitStore = "Unit";

export const Home = () => {
  const classes = useStyles();
  const [syncing, setSyncing] = useState("");
  const [tab, setTab] = useState("addressBook");
  const [unit, setUnit] = useState(localStorage.getItem(UnitStore) as Asset || Assets.ETH as Asset);
  const [csvFiles, setCsvFiles] = useState(getEmptyCsv());
  // Load stored JSON data from localstorage
  const [addressBookJson, setAddressBookJson] = useState(store.load(AddressBookStore));
  // Parse JSON data into utilities
  const [addressBook, setAddressBook] = useState(getAddressBook({
    json: addressBookJson,
    hardcoded: appAddresses,
    logger,
  }));
  const [transactions, setTransactions] = useState(getTransactions({
    json: store.load(TransactionsStore),
    logger,
  }));
  const [vm, setVM] = useState(getValueMachine({
    addressBook,
    json: store.load(ValueMachineStore),
    logger,
  }));
  const [prices, setPrices] = useState(getPrices({
    json: store.load(PricesStore),
    unit,
    logger,
    store,
  })
  );

  const updateSelection = (event: React.ChangeEvent<{}>, selectedTab: string) => {
    setTab(selectedTab);
  };

  const downloadF8949 = async () => {
    if (!vm?.json?.chunks?.length || !prices.json) return;
    const usdPrices = getPrices({
      json: prices.json,
      logger,
      store,
      unit: Assets.USD,
    });
    const taxYear = new Date().getFullYear().toString();
    const getDate = (timestamp: string): string => timestamp.split("T")[0];
    const trades = [];
    for (const chunk of vm.json.chunks) {
      if (chunk.disposeDate?.startsWith(taxYear)) {
        const purchaseDate = getDate(chunk.history[0].date);
        const receivePrice = usdPrices.getNearest(purchaseDate, chunk.asset);
        const assetPrice = usdPrices.getNearest(chunk.disposeDate, chunk.asset);
        if (receivePrice !== assetPrice) {
          trades.push({
            date: getDate(chunk.disposeDate),
            asset: chunk.asset,
            receivePrice,
            assetPrice,
            purchaseDate: purchaseDate,
            quantity: chunk.quantity,
          });
        }
      }
    }
    if (trades.length) {
      setSyncing(`Downloading tax forms for ${trades.length} trades`);
      axios({
        url: "/api/taxes",
        method: "post",
        responseType: "blob",
        data: { trades },
      }).then((response) => {
        setSyncing(``);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "f8949.pdf");
        document.body.appendChild(link);
        link.click();
      }).catch(async () => {
        setSyncing(`Error occured`);
        await new Promise(res => setTimeout(res, 2000));
        setSyncing(``);
      });
    } else {
      setSyncing(`No Taxable trades detected`);
      await new Promise(res => setTimeout(res, 2000));
      setSyncing(``);
    }
  };

  const syncEverything = async () => {
    if (syncing) return;
    setSyncing(`Syncing ${addressBookJson.length} addresses`);
    await new Promise(res => setTimeout(res, 1000));
    const newTransactions = getTransactions({
      logger,
    });

    // Sync Chain Data
    if (addressBookJson?.length) {
      let isEthSynced = false;
      let isPolygonSynced = false;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          console.log(`Attempting to fetch for addressBook`, addressBookJson);
          if (!isEthSynced) {
            setSyncing(`Syncing Ethereum data for ${addressBookJson.length} addresses`);
            const resEth = await axios.post("/api/ethereum", { addressBook: addressBookJson });
            // console.log(`Got ${resEth.data.length} Eth transactions`);
            if (resEth.status === 200 && typeof(resEth.data) === "object") {
              newTransactions.merge(resEth.data);
              isEthSynced = true;
            } else {
              await new Promise((res) => setTimeout(res, 10000));
              continue;
            }
          }
          if (!isPolygonSynced) {
            setSyncing(`Syncing Polygon data for ${addressBookJson.length} addresses`);
            const resPolygon = await axios.post("/api/polygon", { addressBook: addressBookJson });
            console.log(`Got ${resPolygon.data.length} Polygon transactions`);
            if (resPolygon.status === 200 && typeof(resPolygon.data) === "object") {
              newTransactions.merge(resPolygon.data);
              isPolygonSynced = true;
            } else {
              await new Promise((res) => setTimeout(res, 10000));
              continue;
            }
          }
          setSyncing(`Syncing Harmony data for ${addressBookJson.length} addresses`);
          const resHarmony = await axios.post("/api/harmony", { addressBook: addressBookJson });
          console.log(`Got ${resHarmony.data.length} Harmony transactions`);
          if (resHarmony.status === 200 && typeof(resHarmony.data) === "object") {
            newTransactions.merge(resHarmony.data);
          } else {
            await new Promise((res) => setTimeout(res, 10000));
            continue;
          }
          break;
        } catch (e) {
          console.warn(e);
        }
      }
    }
    if (csvFiles.length) {
      for (const csvFile of csvFiles) {
        setSyncing(`Merging ${csvFile.type} data from ${csvFile.name}`);
        newTransactions.mergeCsv(csvFile.data, csvFile.type as any);
      }
    }
    setTransactions(newTransactions);

    // Process Transactions
    setSyncing(`Processing ${newTransactions.json.length} transactions`);
    await new Promise(res => setTimeout(res, 1000));
    const newVM = getValueMachine({ addressBook, logger });
    for (const tx of newTransactions.json.sort(chrono)) {
      setSyncing(`Processing transactions on ${tx.date.split("T")[0]}`);
      newVM.execute(tx);
      await new Promise(res => setTimeout(res, 1)); // yield
    }
    store.save(ValueMachineStore, newVM.json);
    setVM(newVM);
    syncPrices();
  };

  const syncPrices = async () => {
    // Sync Prices
    setSyncing(`Syncing Prices`);
    await new Promise(res => setTimeout(res, 1000));
    try {
      setSyncing(`Syncing Prices for ${vm.json.chunks.length} asset chunks`);
      // Fetch and merge prices for all chunks
      const chunkPrices = await fetchPricesForChunks(unit, vm.json.chunks);
      prices.merge(chunkPrices);
      // Fetch and merge today's prices for currently held assets
      const netWorth = vm.getNetWorth();
      const today = (new Date()).toISOString().split("T")[0];
      const currentPrices = await fetchPriceForAssetsOnDate(
        unit, Object.keys(netWorth), today, prices
      );
      prices.merge(currentPrices);
      // Fetch and merge prices for assets on each event date
      for (const txEvent of vm.json.events) {
        setSyncing(`Syncing Prices on ${txEvent.date.split("T")[0]}`);
        prices.merge((await fetchPriceForAssetsOnDate(
          unit,
          Object.keys(txEvent.newBalances),
          txEvent.date,
          prices
        )));
      }
      // Set prices state to trigger re-render
      setPrices(getPrices({
        json: prices.json,
        logger,
        store,
        unit,
      }));
    } catch (e) {
      console.warn(e);
    }
    setSyncing("");
  };

  useEffect(() => {
    if (!addressBookJson) return;
    console.log(`Refreshing ${addressBookJson.length} address book entries`);
    const newAddressBook = getAddressBook({
      json: addressBookJson,
      hardcoded: appAddresses,
      logger
    });
    setAddressBook(newAddressBook);
    syncEverything();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressBookJson]);

  useEffect(() => {
    if (!transactions?.json?.length) return;
    console.log(`Saving ${transactions.json.length} transactions to localStorage`);
    store.save(TransactionsStore, transactions.json);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);


  useEffect(() => {
    localStorage.setItem(UnitStore, unit);
    syncPrices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  return (<>
    <NavBar
      syncing={syncing}
      unit={unit}
      setUnit={setUnit}
      syncEverything={syncEverything}
      downloadF8949={downloadF8949}
    />
    <TabContext value={tab}>
      <TabPanel value="portfolio" className={classes.panel}>
        <Portfolio vm={vm} prices={prices} unit={unit} />
      </TabPanel>
      <TabPanel value="addressBook" className={classes.panel}>
        <AddressBookManager
          setAddressBookJson={setAddressBookJson}
          addressBook={addressBook}
          csvFiles={csvFiles}
          setCsvFiles={setCsvFiles}
        />
      </TabPanel>

      <AppBar color="inherit" position="fixed" className={classes.appbar}>
        <Tabs
          value={tab}
          onChange={updateSelection}
          indicatorColor="primary"
          variant="fullWidth"
        >
          <Tab value="portfolio" icon={<BarChartIcon />} aria-label="addressBook" />
          <Tab value="addressBook" icon={<AccountIcon />} aria-label="account" />
        </Tabs>
      </AppBar>
    </TabContext>
  </>);
};
