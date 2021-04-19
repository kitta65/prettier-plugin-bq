# prettier-plugin-bq
`@dr666m1/prettier-plugin-bq` is a [prettier](https://prettier.io/) plugin for **standardSQL**, which is a dialect of BigQuery.

This plugin is still a work in progress, so the behavior would change frequently.

## Install
```
npm install --save-dev --save-exact prettier @dr666m1/prettier-plugin-bq
```

## Usage
As the prettier [document](https://prettier.io/docs/en/plugins.html) says, the plugin is automatically loaded.
> Plugins are automatically loaded if you have them installed in the same `node_modules` directory where prettier is located.

You can format `.sql` and `.bq` file by the following command.
```
npx prettier --write ./xxx.sql
```

For more information, please read the prettier document.

## Coding style
This plugin doesn't follow any famous style guides,
because none of them satisfies me.

## Contributing
I'm not ready to accept PR, but your feedback is always welcome.

