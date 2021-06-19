import React, { createContext, useContext } from "react";
import Typography from "@material-ui/core/Typography";
import {
  AddressBook,
  AddressBookJson,
} from "@valuemachine/types";

export const AccountContext = createContext({} as {
  addressBook: AddressBook,
  setAddressBookJson: (val: AddressBookJson) => void,
});

export const AccountManager: React.FC = () => {

  const { addressBook, setAddressBookJson } = useContext(AccountContext);

  return (<>
    <Typography>
      {`Our addressBook contains ${
        addressBook.addresses.length
      } addresses of which ${
        addressBook.addresses.filter(a => addressBook.isSelf(a)).length
      } are ours`}
    </Typography>

    <Typography>
      {`We are ${
        typeof setAddressBookJson === "function" ? "" : "NOT "
      }able to update the addressBook`}
    </Typography>
  </>);
};
