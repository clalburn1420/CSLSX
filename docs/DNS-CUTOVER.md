# Moving cslsx.com from Squarespace to GitHub Pages

The domain is registered at GoDaddy, and GoDaddy runs its DNS (nameservers
`ns47/ns48.domaincontrol.com`). Today its records point at Squarespace. The Squarespace
site keeps serving until these records change.

## Before you start

- The new site is live and checked at the github.io address.
- In the GitHub repo, go to **Settings → Pages → Custom domain**. It shows `cslsx.com`, set
  up when the domain was attached.

## 1. Change the records at GoDaddy

GoDaddy → **My Products → cslsx.com → DNS → DNS Records**.

**Delete** the records that point to Squarespace:

| Type | Name | Value |
|---|---|---|
| A | @ | 198.185.159.144 |
| A | @ | 198.185.159.145 |
| A | @ | 198.49.23.144 |
| A | @ | 198.49.23.145 |
| CNAME | www | ext-sq.squarespace.com |

**Leave everything else alone.** In particular, keep:

- the five **MX** records (`aspmx.l.google.com` and its `alt1`–`alt4` siblings). They
  deliver email for the domain, through Google Workspace.
- the **TXT** records `google-site-verification=…` and `v=spf1 include:zoho.com
  include:_spf.google.com ~all`. They verify the domain with Google and protect outgoing
  mail.

(Checked against the live records on 2026-10-15.)

**Add** these:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 1 hour |
| A | @ | 185.199.109.153 | 1 hour |
| A | @ | 185.199.110.153 | 1 hour |
| A | @ | 185.199.111.153 | 1 hour |
| CNAME | www | clalburn1420.github.io | 1 hour |

## 2. Wait, then turn on HTTPS

DNS changes take anywhere from a few minutes to a few hours. When `https://cslsx.com` shows
the new site:

1. GitHub repo → **Settings → Pages**: wait for the DNS check to go green, then tick
   **Enforce HTTPS**. The certificate can take up to an hour to issue.
2. Check that `https://www.cslsx.com` redirects to `https://cslsx.com`.

## 3. Close Squarespace

Once the new site has served correctly for a few days, cancel the Squarespace plan. Do
**not** transfer the domain to Squarespace or let Squarespace manage it; it stays at GoDaddy.

## Undo

To go back, restore the four Squarespace A records and the `www` CNAME listed above.
