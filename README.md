# Gatsby Notion

This is a project for using a Notion database (collection) as a CMS. As of this writing there are two things here:

- [gatsby-source-notion-collection](packages/gatsby-source-notion-collection)
  - The core of this project at present. This gatsby plugin will pull data from a notion table and transform any row contents into HTML.
- [gatsby-notion-example](packages/gatsby-notion-example)
  - An example using the gatsby plugin above.

You can also see a real example of this project by viewing the source of my blog:

- Source: https://github.com/iansinnott/iansinnott.github.io/tree/source
- Live blog: https://blog.iansinnott.com

## Dev

* Go into the collection project and `yarn build` after adding a debugger or
  changing some code. The TS needs to be compiled to be picked up as changed.
* Go into the example project and `yarn inspect`

That's pretty much it. Breakpoints should get picked up.

## Publishing

After making changes simply `lerna publish`. No need to push to github or manage
versions beforehand. That command takes care of it.
