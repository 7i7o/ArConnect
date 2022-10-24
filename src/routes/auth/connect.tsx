import {
  Button,
  Card,
  Input,
  Section,
  Spacer,
  Text,
  useInput,
  useToasts
} from "@arconnect/components";
import { permissionData, PermissionType } from "~applications/permissions";
import { checkPassword, replyToAuthRequest } from "~wallets/auth";
import type { AuthDataWithID } from "~api/modules/connect/auth";
import { objectFromUrlParams } from "~api/modules/connect/url";
import { CloseLayer } from "~components/popup/WalletHeader";
import type { AppInfo } from "~applications/application";
import { defaultGateway } from "~applications/gateway";
import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@iconicicons/react";
import { useStorage } from "@plasmohq/storage/hook";
import { formatAddress } from "~utils/format";
import PermissionCheckbox, {
  PermissionDescription
} from "~components/auth/PermissionCheckbox";
import { addApp } from "~applications";
import WalletSwitcher from "~components/popup/WalletSwitcher";
import Wrapper from "~components/auth/Wrapper";
import browser from "webextension-polyfill";
import Label from "~components/auth/Label";
import Head from "~components/popup/Head";
import App from "~components/auth/App";
import styled from "styled-components";

export default function Connect() {
  // active address
  const [activeAddress] = useStorage<string>({
    key: "active_address",
    area: "local",
    isSecret: true
  });

  // wallet switcher open
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // page
  const [page, setPage] = useState<"unlock" | "permissions">("unlock");

  // connect params
  const [params, setParams] = useState<AuthDataWithID>();

  // fetch params
  useEffect(() => {
    const urlParams = window.location.href.split("?");
    const params = objectFromUrlParams<AuthDataWithID>(
      urlParams[urlParams.length - 1].replace(window.location.hash, "")
    );

    setParams(params);
  }, []);

  // app data
  const appData = useMemo<AppInfo>(() => {
    if (!params) return {};

    return params.appInfo;
  }, [params]);

  // app url
  const appUrl = useMemo(() => {
    if (!params) return "";

    return params.url;
  }, [params]);

  // requested permissions
  const requestedPermissions = useMemo<PermissionType[]>(() => {
    if (!params) return [];

    const requested: string[] = params.permissions;

    return requested.filter((p) =>
      Object.keys(permissionData).includes(p)
    ) as PermissionType[];
  }, [params]);

  // permissions to add
  const [permissions, setPermissions] = useState<PermissionType[]>([]);

  useEffect(() => setPermissions(requestedPermissions), [requestedPermissions]);

  // password input
  const passwordInput = useInput();

  // toasts
  const { setToast } = useToasts();

  // unlock
  async function unlock() {
    if (!(await checkPassword(passwordInput.state))) {
      return setToast({
        type: "error",
        content: browser.i18n.getMessage("invalidPassword"),
        duration: 2200
      });
    }

    setPage("permissions");
  }

  // connect
  async function connect() {
    if (appUrl === "") return;

    // add the app
    await addApp({
      url: appUrl,
      permissions,
      name: appData.name,
      logo: appData.logo,
      gateway: params.gateway || defaultGateway
    });

    // send response
    await replyToAuthRequest("connect", params.authID);

    // close the window
    closeWindow();
  }

  // cancel
  async function cancel() {
    // send response
    await replyToAuthRequest(
      "connect",
      params.authID,
      "User cancelled the auth"
    );

    // close the window
    closeWindow();
  }

  // send cancel event if the popup is closed by the user
  window.onbeforeunload = cancel;

  // remove cancel event and close the window
  function closeWindow() {
    window.onbeforeunload = null;
    window.close();
  }

  return (
    <Wrapper>
      <div>
        <Head title={browser.i18n.getMessage("sign_in")} showOptions={false} />
        <Spacer y={0.75} />
        <App
          appName={appData.name || appUrl}
          appUrl={appUrl}
          gateway={params?.gateway || defaultGateway}
          appIcon={appData.logo}
        />
        <Spacer y={1.5} />
        {page === "unlock" && (
          <Section>
            <Label>{browser.i18n.getMessage("wallet")}</Label>
            <Spacer y={0.4} />
            <WalletSelectWrapper>
              <WalletSelect onClick={() => setSwitcherOpen(true)}>
                <Address>{formatAddress(activeAddress || "", 10)}</Address>
                <SelectIcon />
              </WalletSelect>
              {switcherOpen && (
                <CloseLayer onClick={() => setSwitcherOpen(false)} />
              )}
              <WalletSwitcher
                open={switcherOpen}
                close={() => setSwitcherOpen(false)}
                showOptions={false}
                exactTop={true}
                noPadding={true}
              />
            </WalletSelectWrapper>
            <Spacer y={1} />
            <Input
              type="password"
              placeholder={browser.i18n.getMessage("enter_your_password")}
              label={browser.i18n.getMessage("password")}
              fullWidth
              {...passwordInput.bindings}
            />
          </Section>
        )}
        {page === "permissions" && (
          <Section>
            <Text>{browser.i18n.getMessage("allow_these_permissions")}</Text>
            {requestedPermissions.map((permission, i) => (
              <div key={i}>
                <PermissionCheckbox
                  checked={permissions.includes(permission)}
                  onChange={(checked) =>
                    setPermissions((val) => {
                      if (checked && val.includes(permission)) return val;
                      if (!checked && !val.includes(permission)) return val;
                      if (checked && !val.includes(permission)) {
                        return [...val, permission];
                      }
                      if (!checked && val.includes(permission)) {
                        return val.filter((p) => p !== permission);
                      }
                    })
                  }
                >
                  {permission.toUpperCase()}
                  <br />
                  <PermissionDescription>
                    {browser.i18n.getMessage(
                      permissionData[permission.toUpperCase()]
                    )}
                  </PermissionDescription>
                </PermissionCheckbox>
                {i !== requestedPermissions.length - 1 && <Spacer y={0.8} />}
              </div>
            ))}
          </Section>
        )}
      </div>
      <Section>
        <Button
          fullWidth
          onClick={async () => {
            if (page === "unlock") {
              await unlock();
            } else {
              await connect();
            }
          }}
        >
          {browser.i18n.getMessage(page === "unlock" ? "sign_in" : "connect")}
        </Button>
        <Spacer y={0.75} />
        <Button fullWidth secondary onClick={cancel}>
          {browser.i18n.getMessage("cancel")}
        </Button>
      </Section>
    </Wrapper>
  );
}

const WalletSelectWrapper = styled.div`
  position: relative;
`;

const WalletSelect = styled(Card)`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border-width: 2.5px;
  border-radius: 22px;
`;

const Address = styled(Text).attrs({
  noMargin: true
})`
  color: rgb(${(props) => props.theme.theme});
`;

const SelectIcon = styled(ChevronDownIcon)`
  font-size: 1.25rem;
  width: 1em;
  height: 1em;
  color: rgb(${(props) => props.theme.theme});
`;