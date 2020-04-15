"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const gatsby_link_1 = require("gatsby-link");
const react_helmet_1 = require("react-helmet");
require("./index.css");
const Header = () => (React.createElement("div", { style: {
        background: "rebeccapurple",
        marginBottom: "1.45rem",
    } },
    React.createElement("div", { style: {
            margin: "0 auto",
            maxWidth: 960,
            padding: "1.45rem 1.0875rem",
        } },
        React.createElement("h1", { style: { margin: 0 } },
            React.createElement(gatsby_link_1.default, { to: "/", style: {
                    color: "white",
                    textDecoration: "none",
                } }, "Gatsby")))));
class DefaultLayout extends React.PureComponent {
    render() {
        return (React.createElement("div", null,
            React.createElement(react_helmet_1.default, { title: "Gatsby Default Starter", meta: [
                    { name: "description", content: "Sample" },
                    { name: "keywords", content: "sample, something" },
                ] }),
            React.createElement(Header, null),
            React.createElement("div", { style: {
                    margin: "0 auto",
                    maxWidth: 960,
                    padding: "0px 1.0875rem 1.45rem",
                    paddingTop: 0,
                } }, this.props.children())));
    }
}
exports.default = DefaultLayout;
//# sourceMappingURL=index.js.map