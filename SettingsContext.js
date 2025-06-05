import React, { createContext, useState } from 'react';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState('');
  const [risk, setRisk] = useState('moderate');
  const [language, setLanguage] = useState('en');
  const [assetType, setAssetType] = useState('Forex');
  const [tradeStyle, setTradeStyle] = useState('Intraday');

  return (
    <SettingsContext.Provider
      value={{
        portfolio, setPortfolio,
        risk, setRisk,
        language, setLanguage,
        assetType, setAssetType,
        tradeStyle, setTradeStyle,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
