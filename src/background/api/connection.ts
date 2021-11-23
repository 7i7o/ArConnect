import { IPermissionState } from "../../stores/reducers/permissions";
import {
  createAuthPopup,
  getPermissions,
  getStoreData,
  setStoreData
} from "../../utils/background";
import { MessageFormat, validateMessage } from "../../utils/messenger";
import { browser } from "webextension-polyfill-ts";
import { getRealURL } from "../../utils/url";
import { updateIcon } from "../icon";

/**
 * APIs for a Web 2 like login system, but
 * on Web 3, using the ArConnect extension
 */

// create a new connection between
// ArConnect and the site that
// requested it
export async function connect(
  message: MessageFormat,
  tabURL: string,
  faviconUrl?: string
): Promise<Partial<MessageFormat>> {
  // a permission array must be submitted
  if (!message.permissions)
    return {
      res: false,
      message: "No permissions requested"
    };

  // check requested permissions and existing permissions
  const existingPermissions = await getPermissions(tabURL);

  // the site has a saved permission store
  if (existingPermissions) {
    let hasAllPermissions = true;

    // if there is one permission that isn't stored in the
    // permissions store of the url
    // we set hasAllPermissions to false
    for (const permission of message.permissions)
      if (!existingPermissions.includes(permission)) hasAllPermissions = false;

    // if all permissions are already granted we return
    if (hasAllPermissions)
      return {
        res: false,
        message: "All permissions are already allowed for this site"
      };
  }
  message.appInfo.logo = faviconUrl || message.appInfo?.logo;

  createAuthPopup({
    permissions: message.permissions,
    appInfo: message.appInfo,
    type: "connect",
    url: tabURL
  });

  return await new Promise((resolve) => {
    browser.runtime.onMessage.addListener(async (msg) => {
      if (!validateMessage(msg, { sender: "popup", type: "connect_result" }))
        return;
      updateIcon(true);
      resolve(msg);
    });
  });
}

export async function disconnect(
  tabURL: string
): Promise<Partial<MessageFormat>> {
  try {
    const store = await getStoreData();
    await setStoreData({
      permissions: (store.permissions ?? []).filter(
        (sitePerms: IPermissionState) => sitePerms.url !== getRealURL(tabURL)
      )
    });
    updateIcon(false);
    return { res: true };
  } catch {
    return { res: false, message: "Could not disconnect" };
  }
}
