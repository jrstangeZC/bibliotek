# Koble GitHub MCP til Claude Code

## 1. Lag et token

[github.com/settings/tokens](https://github.com/settings/tokens) → **Fine-grained tokens** → **Generate new token**. Velg repo og tilganger (Contents, Issues, Pull requests). Kopier verdien — den vises én gang.

## 2. Legg det i `.env`

```
GITHUB_PAT=github_pat_tokenet_ditt_her
```

Sjekk at filen er ignorert: `git check-ignore .env` skal svare `.env`.

## 3. Last inn tokenet

Én kommando om gangen — trykk Enter mellom hver.

**Mac:**

```
export GITHUB_PAT="$(grep '^GITHUB_PAT=' .env | cut -d '=' -f2-)"
```

```
echo ${#GITHUB_PAT}
```

**Windows:**

```
$githubPatLine = Get-Content .env | Select-String "^\s*GITHUB_PAT\s*=" | Select-Object -First 1
```

```
$env:GITHUB_PAT = ($githubPatLine.Line -split "=", 2)[1].Trim().Trim('"').Trim("'")
```

```
$env:GITHUB_PAT.Length
```

> PowerShell limer flere linjer inn som én. Limer du hele blokken samlet, blir det feil — derfor én om gangen.

## 4. Registrer serveren

Samme vindu som steg 3.

**Mac:**

```
claude mcp add --transport http github https://api.githubcopilot.com/mcp -H "Authorization: Bearer $GITHUB_PAT"
```

**Windows:**

```
claude mcp add --transport http github https://api.githubcopilot.com/mcp -H "Authorization: Bearer $env:GITHUB_PAT"
```

## 5. Sjekk og start på nytt

```
claude mcp list
```

Skal vise `github: … ✓ Connected`. Start så Claude Code på nytt.

---

## Hvis det feiler

| Feil | Årsak |
|------|-------|