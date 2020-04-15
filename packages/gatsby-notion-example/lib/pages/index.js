"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const gatsby_link_1 = require("gatsby-link");
class default_1 extends React.Component {
    constructor(props, context) {
        super(props, context);
    }
    render() {
        return (React.createElement("div", null,
            React.createElement("h1", null, "Hi people"),
            React.createElement("p", null,
                "Welcome to your new",
                " ",
                React.createElement("strong", null, this.props.data.site.siteMetadata.title),
                " site."),
            React.createElement("p", null, "Now go build something great."),
            React.createElement(gatsby_link_1.default, { to: "/page-2/" }, "Go to page 2")));
    }
}
exports.default = default_1;
exports.pageQuery = graphql `
  query IndexQuery {
    site {
      siteMetadata {
        title
      }
    }
  }
`;
//# sourceMappingURL=index.js.map