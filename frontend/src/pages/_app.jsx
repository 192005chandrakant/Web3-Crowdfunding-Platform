require("../styles/globals.css");

const React = require("react");
const { Web3Provider } = require("../context/Web3Provider");

function App({ Component, pageProps }) {
  return React.createElement(Web3Provider, null, React.createElement(Component, pageProps));
}

module.exports = App;