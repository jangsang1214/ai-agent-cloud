# Quick Start

## macOS
1. Install Python 3.11+.
2. Install Git.
3. Install GitHub CLI.
4. Authenticate GitHub:
   `gh auth login`
5. Create a virtual environment:
   `python3 -m venv .venv`
6. Activate:
   `source .venv/bin/activate`
7. Install:
   `pip install -r requirements.txt`
8. Copy `.env.example` to `.env` and add your API key locally.
9. Run:
   `python main.py`

## Windows
Use:
`py -m venv .venv`
then:
`.venv\Scripts\activate`
and:
`pip install -r requirements.txt`
then:
`py main.py`

Never commit `.env`.
