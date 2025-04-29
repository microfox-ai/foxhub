import { App } from "@octokit/app";
import { config } from "dotenv";

config();

// const MicrofoxApp = App.defaults({
//   appId: process.env.GITHUB_APP_ID!,
//   privateKey: process.env.GITHUB_PRIVATE_KEY!,
//   webhooks: {
//     secret: process.env.GITHUB_WEBHOOK_SECRET!,
//   },
//   oauth: {
//     clientId: process.env.GITHUB_CLIENT_ID!,
//     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
//   },
// });

export const MicrofoxAiApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAoVQB1JJas0ywBFgcOZdLDn/VYbCfqWZbCyuQaxslC4zBAxp9
FHKNNiMSCm4EQPipgxl+pX6YL/BWeYwE7/1oRD8tVTsPayaic196eZqfwqJaaRQt
KlkFzaZaWh0egH1BdaXdNB4Icwkj1Dsq5UQH7aDadv+DuowCpH3oR7sBZRpBPlAe
rbYXApGTK20QpIInFIHVhRa46rxN1jA5/sfgLhlE3MuJqAd0QmQGRqfkfbmsGHOh
KmayYzeAPBDh6p/XdrGDQXrYUEq4v80bDAW5Cww9wpG2uJNvlW8ot2t0r4ZW2zq1
saKeaUr8LLkTMU4nsjUpeXXSyRH0GIafOyu0pQIDAQABAoIBAAVTtMvEGWKaQaWj
EyuDp2LPLciQAHWjf5Ya1iXzO4HqH+VuVnr6XVdQSSQ3BcTvcQl3Kgtk5rmOggx5
ZyBVib/XJjQOQzASkoKkwHKLfIL8wWd+1w7y6ZIk0A7xrzQm7qZn16oE49qIjrpP
SddQK8LY8N3FCiB6xwuPbMARmLYx3lHZ0jbEFhgNOsLwXl4jO9ekidzZfbHcmFbt
JPo4QQo0g+1klWHWWNtnMkRiC/p8jfCLRuZdRBDmtt84fZyk0OYr+JMRTnhBXPn5
6zjo+g2NDC6XuB47aNZdTWCsUHtr2irsp4O+PqY/rTnH3gayqlDnzO0Olb12xgh4
K48qj/ECgYEAzCUVmBnaJttFBhrPXsPgWiNp/elYB6O448KG6ja9ryoMP0/aN8Va
G1046AmMnzzgo3dk16NjRN2D/Sr+bFEuZa01itWa4L99gpxpghfWSvydTOMJWrG/
FvzhOnc9JuXkGS0bAShvz/q1NjV6KH+9wE08Pe3HFUxdNZaq0FMyNOcCgYEAyk6u
7LgF83MXOFey1YtEWKsDyjHTNlKSiGsHBCUdNPvSkOsMb+I8aE29I35e5SGNvq4p
00U4I3Jxw6p2rcaVOZikVyy3kDlHn71PG7Hp/hUqH0oDix2ZTnLrLl82Nii0+xqg
IGDEvc/J4yG0Suwop1Ov1LsPajLTj8APYiYvjJMCgYAiVHYuLuLFuAgCf82xpQT8
g4oWfgAkwL6d5p+jkXMSmuKWXwpWaKS/h0zDkJ+KQ8WPF8voi3xtH0dL8sf4VSqV
RKyFXWh/NRSZO05u5y1NTO/y9xcinlOBPSNvHpA1E2HpbfFln3Q2KHYC2LljSCAT
z6k6zNq21TGzilPNVsBRrwKBgCZmuR2F8Ns9RXMUcoXGYbrS+20t+AGfuuDaMALB
aMHd6yJG+51hPEYwO265Vhn4PIetV5Ma2IUh/CY//TcPMtQz/T3u5wkhVk8kCBgh
tWDdc5ls2y9U9vzFI48x04CESZZAf5SlybKd9px+kVKHcVARupaOy2ZFL5NhyYm/
5daxAoGALvSAXepky6YVk0GesFWRLxKdkKXVa9kMH7EcwXDox6+xGYRQ72hb8Tqe
RVPVtNcYQBF6WS9QSiq1nc/Ui1TPY3/e0DysyDknYAi+Ehv/VReybezwBmFc6qH1
PgOWScX548dP4glQOgXUFbjSYEuz1ySAcbzEcZ/s1vQZaYjQ5Ew=
-----END RSA PRIVATE KEY-----`,
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  },
  oauth: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
});
