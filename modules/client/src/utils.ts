import { appAddresses } from "@degenfolio/adapters";
import { smeq } from "@valuemachine/utils";
import { AddressBookJson, AddressEntry, AddressBook, AddressCategories } from "@valuemachine/types";

export const mergeAppAddresses = (addressBookJson: AddressBookJson): AddressBookJson => {
  // Create deep copy of addressBook and return new instance.
  const _addressBookJson = JSON.parse(JSON.stringify(addressBookJson)) as AddressBookJson;
  for (const appEntry of appAddresses) {
    if (!_addressBookJson.some(entry => smeq(entry.address, appEntry.address))) {
      _addressBookJson.push(appEntry);
    }
  }
  return _addressBookJson;
};

export const mergeAddresses = (ab1: AddressBookJson, ab2: AddressBookJson): AddressBookJson => {
  // Create deep copy of addressBook and return new instance.
  const _addressBookJson = JSON.parse(JSON.stringify(ab1)) as AddressBookJson;
  for (const addEntry of ab2) {
    if (!_addressBookJson.some(entry => smeq(entry.address, addEntry.address))) {
      _addressBookJson.push(addEntry);
    }
  }
  return _addressBookJson;
};

export const getExternalAddress = (addressBook: AddressBook): AddressBookJson => {
  const externAddresses = addressBook.json.filter((a: AddressEntry) => {

    const isExternal = ()
      Object.keys(AddressCategories).some(category => addressBook.isCategory(category));
    console.log(isExternal)
    return isExternal
  }
    )
  return externAddresses;
}