import { useHistory } from "~utils/hash_router";
import { Section } from "@arconnect/components";
import { EditIcon } from "@iconicicons/react";
import { useTokens } from "~tokens";
import { useMemo } from "react";
import browser from "webextension-polyfill";
import Token from "~components/popup/Token";
import styled from "styled-components";
import HeadV2 from "~components/popup/HeadV2";

export default function Tokens() {
  // all tokens
  const tokens = useTokens();

  // assets
  const assets = useMemo(
    () => tokens.filter((token) => token.type === "asset"),
    [tokens]
  );

  // router push
  const [push] = useHistory();

  return (
    <>
      <HeadV2 title={browser.i18n.getMessage("assets")} />
      <TokensList>
        {assets.map((token, i) => (
          <Token
            {...token}
            onClick={() => push(`/token/${token.id}`)}
            key={i}
          />
        ))}
        <ManageButton
          href={`${browser.runtime.getURL("tabs/dashboard.html")}#/tokens`}
        >
          <EditIcon />
          {browser.i18n.getMessage("manage_assets_button")}
        </ManageButton>
      </TokensList>
    </>
  );
}

const TokensList = styled(Section)`
  display: flex;
  flex-direction: column;
  gap: 0.82rem;
`;

const ManageButton = styled.a.attrs({
  rel: "noopener noreferer",
  target: "_blank"
})`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  font-weight: 400;
  padding: 0.55rem 0;
  color: rgb(${(props) => props.theme.theme});
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.85;
  }

  svg {
    font-size: 1em;
    width: 1em;
    height: 1em;
  }
`;
