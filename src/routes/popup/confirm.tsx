import { useState, useEffect } from "react";
import { useHistory } from "~utils/hash_router";
import browser from "webextension-polyfill";
import styled from "styled-components";
import { ExtensionStorage } from "~utils/storage";
import { useTheme, hoverEffect } from "~utils/theme";
import { ArrowLeftIcon } from "@iconicicons/react";
import { Section } from "@arconnect/components";
import type { DisplayTheme } from "@arconnect/components";
import BuyButton from "~components/popup/home/BuyButton";
import { getActiveWallet } from "~wallets";
import { buyRequest } from "~lib/onramper";
import { useStorage } from "@plasmohq/storage/hook";
import { PageType, trackPage } from "~utils/analytics";

export default function ConfirmPurchase() {
  const [push] = useHistory();

  const theme = useTheme();

  const [activeWallet, setActiveWallet] = useState("");
  const [selectedFiat, setSelectedFiat] = useState("");
  const [payout, setPayout] = useState(0);
  const [rate, setRate] = useState(0);
  const [networkFee, setNetworkFee] = useState(0);
  const [vendorFee, setVendorFee] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [onramp, setOnramp] = useState("");
  const [fiatAmount, setFiatAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentName, setPaymentName] = useState("");

  const [isBackFromConfirm, setIsBackFromConfirm] = useStorage(
    {
      key: "isBackFromConfirm",
      instance: ExtensionStorage
    },
    null
  );

  //segment
  useEffect(() => {
    trackPage(PageType.ONRAMP_CONFIRM_PURCHASE);
  }, []);

  useEffect(() => {
    async function fetchActiveWallet() {
      const wallet = await getActiveWallet();
      setActiveWallet(wallet.address);
    }
    fetchActiveWallet();
  }, []);

  async function getActiveQuote() {
    const activeQuote = await ExtensionStorage.get("quote");

    return activeQuote;
  }

  useEffect(() => {
    async function fetchActiveQuote() {
      const quote = await getActiveQuote();

      setOnramp(quote.ramp);
      setSelectedFiat(quote.selectedFiat.toUpperCase());
      setFiatAmount(quote.fiatAmount);
      setPaymentMethod(quote.selectedPaymentMethod);
      const paymentChoice = quote.availablePaymentMethods.find(
        (method) => method.paymentTypeId === quote.selectedPaymentMethod
      );
      if (paymentChoice) {
        setPaymentName(paymentChoice.name);
      }
      setPayout(quote.payout);
      const totalRate = (Number(quote.payout) * Number(quote.rate)).toFixed(2);
      setRate(totalRate);
      setNetworkFee(quote.networkFee);
      setVendorFee(quote.transactionFee);
      const total =
        Number(totalRate) +
        Number(quote.networkFee) +
        Number(quote.transactionFee);
      setTotalCost(total);
    }
    fetchActiveQuote();
  }, []);

  const buyAR = async () => {
    try {
      const wallet = {
        address: activeWallet
      };

      const requestBody = {
        onramp,
        source: selectedFiat,
        amount: fiatAmount,
        paymentMethod,
        wallet: wallet
      };

      const response = await buyRequest(
        requestBody.onramp,
        requestBody.source,
        requestBody.amount,
        requestBody.paymentMethod,
        requestBody.wallet
      );

      if (
        response &&
        response.message &&
        response.message.transactionInformation &&
        response.message.transactionInformation.url
      ) {
        // Redirect the user to the provided URL
        browser.tabs.update({
          url: response.message.transactionInformation.url
        });
        setIsBackFromConfirm(false);
        push("/purchase-pending");
      } else {
        console.error("Invalid response format or missing URL");
      }
    } catch (error) {
      console.error("Error buying AR:", error);
    }
  };

  const handleBack = () => {
    setIsBackFromConfirm(true);
    push("/purchase");
  };

  return (
    <Wrapper>
      <div>
        <Header>
          <BackWrapper>
            <ExitIcon onClick={() => handleBack()}>
              {browser.i18n.getMessage("exit_buy_screen")}
            </ExitIcon>
          </BackWrapper>
          <Title>{browser.i18n.getMessage("confirm_purchase_title")}</Title>
        </Header>
        <MainContent>
          <WalletTitle displayTheme={theme}>
            {browser.i18n.getMessage("wallet_address")}
          </WalletTitle>
          <Address displayTheme={theme}>{activeWallet}</Address>
          <OrderTitle displayTheme={theme}>
            {browser.i18n.getMessage("order_details")}
          </OrderTitle>
          <HL />
          <DetailWrapper>
            <DetailTitle displayTheme={theme}>
              {browser.i18n.getMessage("buy_screen_payment_method")}
            </DetailTitle>
            <DetailValue displayTheme={theme}>{paymentName}</DetailValue>
          </DetailWrapper>
          <HL />
          <DetailWrapper>
            <DetailTitle displayTheme={theme}>
              {browser.i18n.getMessage("confirm_rate")}
            </DetailTitle>
            <DetailValue displayTheme={theme}>
              {payout} {browser.i18n.getMessage("AR_button")} = {rate}{" "}
              {selectedFiat}
            </DetailValue>
          </DetailWrapper>
          <HL />
          <DetailWrapper>
            <DetailTitle displayTheme={theme}>
              {browser.i18n.getMessage("transaction_fee")}
            </DetailTitle>
            <DetailValue displayTheme={theme}>
              {networkFee} {selectedFiat}
            </DetailValue>
          </DetailWrapper>
          <HL />
          <DetailWrapper>
            <DetailTitle displayTheme={theme}>
              {browser.i18n.getMessage("confirm_vendor_fee")}
            </DetailTitle>
            <DetailValue displayTheme={theme}>
              {vendorFee} {selectedFiat}
            </DetailValue>
          </DetailWrapper>
          <HL />
          <DetailWrapper>
            <OrderTitle displayTheme={theme}>
              {browser.i18n.getMessage("confirm_total")}
            </OrderTitle>
            <OrderTitle displayTheme={theme}>
              {totalCost} {selectedFiat}
            </OrderTitle>
          </DetailWrapper>
        </MainContent>
      </div>
      <Section>
        <BuyButton
          id="buy-ar-button"
          useCustomClickHandler={true}
          logo={false}
          onClick={buyAR}
        />
      </Section>
    </Wrapper>
  );
}

const DetailValue = styled.div<{ displayTheme: DisplayTheme }>`
  color: ${(props) => (props.displayTheme === "light" ? "000000" : "#ffffff")};
  font-size: 12px;
  font-weight: 500;
`;

const DetailTitle = styled.div<{ displayTheme: DisplayTheme }>`
  color: ${(props) => (props.displayTheme === "light" ? "000000" : "#ffffff")};
  font-size: 12px;
  font-weight: 200;
`;

const DetailWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const HL = styled.hr`
  width: 100%;
  border: 1px solid #ab9aff26;
`;

const OrderTitle = styled.div<{ displayTheme: DisplayTheme }>`
  color: ${(props) => (props.displayTheme === "light" ? "000000" : "#ffffff")};
  font-weight: 500;
  font-size: 14px;
`;

const Address = styled.div<{ displayTheme: DisplayTheme }>`
  color: ${(props) =>
    props.displayTheme === "light" ? "000000" : "#ffffffb2"};
  font-size: 13px;
  margin-bottom: 33px;
`;

const WalletTitle = styled.div<{ displayTheme: DisplayTheme }>`
  height: 33px;
  color: ${(props) => (props.displayTheme === "light" ? "000000" : "#ffffff")};
  font-size: 18px;
  font-weight: 500;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  justify-content: space-between;
`;

const Header = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  padding: 23.6px 12px 12.4px 12px;
  margin-bottom: 18px;
`;

const Title = styled.div`
  color: #ab9aff;
  display: inline-block;
  font-size: 22px;
  font-weight: 500;
`;

const BackWrapper = styled.div`
  position: relative;
  display: flex;
  width: max-content;
  height: max-content;
  cursor: pointer;
  margin: 0px 12px 0px 3px;

  ${hoverEffect}

  &::after {
    width: 158%;
    height: 158%;
    border-radius: 100%;
  }

  &:active svg {
    transform: scale(0.92);
  }
`;

const ExitIcon = styled(ArrowLeftIcon)`
  color: #ab9aff;
  height: 30px;
  width: 30px;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0px 12px 4.8px 12px;
`;
