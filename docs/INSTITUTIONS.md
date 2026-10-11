# 🏫 Guideline for institutions

**English** · [Türkçe](INSTITUTIONS.tr.md)

How universities and LMS administrators can work with Mcp4Lms, run their own instance, or request
an opt-out. Mcp4Lms is an experimental, non-profit, volunteer-run project and never asks for payment.

| Topic | Contact |
|---|---|
| Collaboration, opt-outs, takedowns, other questions | [maintainers@mcp4lms.com](mailto:maintainers@mcp4lms.com) |
| Security vulnerabilities and incidents | [security@mcp4lms.com](mailto:security@mcp4lms.com) (private, never a public issue) |

## 🧭 Choose a path

| You want to… | Path |
|---|---|
| Offer students an official, governed integration | [🤝 Collaborate](#-collaborate) |
| Run and control the service yourself | [🏢 Self-host](#-self-host) |
| Stop Mcp4Lms working with your LMS | [🚫 Request an opt-out](#-request-an-opt-out) |
| Report a vulnerability | Email the security address. Do not include it in an opt-out request. |

We prefer collaboration. In most cases an official, scoped integration addresses a concern better
than a block.

## 🤝 Collaborate

Goal: replace the bookmarklet with an official, consent-gated path that your institution controls.

1. **Contact** the maintainers with your institution, LMS URL and the team involved (IT, legal,
   data protection).
2. **Scope** the integration together. Typical topics:
   - [ ] A client registered on your LMS, with standard OAuth instead of the bookmarklet
   - [ ] Allowed data and permission scopes
   - [ ] Student consent screen and wording
   - [ ] Access logging and retention
   - [ ] AI tool policy and which tools are enabled
   - [ ] Legal agreements your institution requires
3. **Pilot** with a small group of students.
4. **Roll out** and publish the integration as an official resource.

Collaboration depends on volunteer availability and is not guaranteed.

## 🏢 Self-host

Goal: run your own instance, governed by your institution.

1. Fork this repository.
2. Follow [Deploying your own instance](../README.md#-deploying-your-own-instance).
3. Before launch, check:
   - [ ] `LMS_URL` and `PUBLIC_URL` point to your LMS and your domain
   - [ ] Your own security and maintainer contacts replace ours in the copy and `security.txt`
   - [ ] The Privacy page matches how you operate, including any logging you enable
   - [ ] Your source changes are offered to your users, as required by the
     [AGPL-3.0](../LICENSE) for network services

Volunteers may help on request, subject to availability.

## 🚫 Request an opt-out

### What to send

Email the maintainers with:

- [ ] Sent from an official institutional email domain
- [ ] Institution name and LMS URL
- [ ] Your name and role (for example IT, legal, data protection)
- [ ] Your concerns and any policy or legal basis
- [ ] Confirmation that the request may be published if approved, or why an
  [exception](#publication) applies
- [ ] A contact for follow-up

### How we handle it

1. **Acknowledge** receipt.
2. **Verify** the sender's domain and role.
3. **Review** the concerns. We may propose a collaboration as an alternative.
4. **Decide** and reply with one of:
   - Approved
   - Alternative proposed
   - Declined, with reasons

Sending a request does not by itself guarantee removal.

### If approved

- [ ] The institution is removed from the university list on the hosted version
- [ ] Hosted accounts for that LMS are deleted and their app connections revoked
- [ ] The LMS URL is added to the blocklist in this repository, so self-hosted copies do not work
  with it out of the box
- [ ] The request is published as a notice, unless an exception applies

### Publication

Approved takedowns affect many students, so we publish them in the project's public channels for
transparency. Please send requests as non-confidential.

We do not publish requests that concern:

- A proven privacy issue
- A security flaw or incident
- A newly discovered security or design flaw
