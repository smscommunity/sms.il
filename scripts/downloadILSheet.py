import sys
import requests
from string import Template

def main():
  sheet_id = sys.argv[1]

  fetchUrl = Template('https://docs.google.com/spreadsheets/d/$sheet_id/export?format=xlsx').substitute(sheet_id=sheet_id)

  r = requests.get(fetchUrl, stream=True)

  with open('./data/ilsheet.xlsx', 'wb') as fd:
    for chunk in r.iter_content(chunk_size=128):
      fd.write(chunk)
  fd.close()

main()