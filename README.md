# sms.il

The IL Leaderboards built in NextJS, Typescript, and React.

## Running locally

The IL sheet isn't stored in the repo. Grab the copy the live site uses, then run the dev server:

```sh
curl -o data/ilsheet.xlsx https://ilview.sunmar.io/ilsheet.xlsx
yarn
yarn dev
```

## How the data updates

Every 10 minutes the Build & Deploy workflow downloads the sheet, updates `public/wr-history.json`
(`scripts/wr_history/update.py`), and rebuilds the site only if the leaderboard changed.

## Todo

Everything lolol.
