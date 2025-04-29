import { App } from "@octokit/app";
import { config } from "dotenv";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";

config();

export const PackageFox = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: `-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAoVQB1JJas0ywBFgcOZdLDn/VYbCfqWZbCyuQaxslC4zBAxp9FHKNNiMSCm4EQPipgxl+pX6YL/BWeYwE7/1oRD8tVTsPayaic196eZqfwqJaaRQtKlkFzaZaWh0egH1BdaXdNB4Icwkj1Dsq5UQH7aDadv+DuowCpH3oR7sBZRpBPlAerbYXApGTK20QpIInFIHVhRa46rxN1jA5/sfgLhlE3MuJqAd0QmQGRqfkfbmsGHOhKmayYzeAPBDh6p/XdrGDQXrYUEq4v80bDAW5Cww9wpG2uJNvlW8ot2t0r4ZW2zq1saKeaUr8LLkTMU4nsjUpeXXSyRH0GIafOyu0pQIDAQABAoIBAAVTtMvEGWKaQaWjEyuDp2LPLciQAHWjf5Ya1iXzO4HqH+VuVnr6XVdQSSQ3BcTvcQl3Kgtk5rmOggx5ZyBVib/XJjQOQzASkoKkwHKLfIL8wWd+1w7y6ZIk0A7xrzQm7qZn16oE49qIjrpPSddQK8LY8N3FCiB6xwuPbMARmLYx3lHZ0jbEFhgNOsLwXl4jO9ekidzZfbHcmFbtJPo4QQo0g+1klWHWWNtnMkRiC/p8jfCLRuZdRBDmtt84fZyk0OYr+JMRTnhBXPn56zjo+g2NDC6XuB47aNZdTWCsUHtr2irsp4O+PqY/rTnH3gayqlDnzO0Olb12xgh4K48qj/ECgYEAzCUVmBnaJttFBhrPXsPgWiNp/elYB6O448KG6ja9ryoMP0/aN8VaG1046AmMnzzgo3dk16NjRN2D/Sr+bFEuZa01itWa4L99gpxpghfWSvydTOMJWrG/FvzhOnc9JuXkGS0bAShvz/q1NjV6KH+9wE08Pe3HFUxdNZaq0FMyNOcCgYEAyk6u7LgF83MXOFey1YtEWKsDyjHTNlKSiGsHBCUdNPvSkOsMb+I8aE29I35e5SGNvq4p00U4I3Jxw6p2rcaVOZikVyy3kDlHn71PG7Hp/hUqH0oDix2ZTnLrLl82Nii0+xqgIGDEvc/J4yG0Suwop1Ov1LsPajLTj8APYiYvjJMCgYAiVHYuLuLFuAgCf82xpQT8g4oWfgAkwL6d5p+jkXMSmuKWXwpWaKS/h0zDkJ+KQ8WPF8voi3xtH0dL8sf4VSqVRKyFXWh/NRSZO05u5y1NTO/y9xcinlOBPSNvHpA1E2HpbfFln3Q2KHYC2LljSCATz6k6zNq21TGzilPNVsBRrwKBgCZmuR2F8Ns9RXMUcoXGYbrS+20t+AGfuuDaMALBaMHd6yJG+51hPEYwO265Vhn4PIetV5Ma2IUh/CY//TcPMtQz/T3u5wkhVk8kCBghtWDdc5ls2y9U9vzFI48x04CESZZAf5SlybKd9px+kVKHcVARupaOy2ZFL5NhyYm/5daxAoGALvSAXepky6YVk0GesFWRLxKdkKXVa9kMH7EcwXDox6+xGYRQ72hb8TqeRVPVtNcYQBF6WS9QSiq1nc/Ui1TPY3/e0DysyDknYAi+Ehv/VReybezwBmFc6qH1PgOWScX548dP4glQOgXUFbjSYEuz1ySAcbzEcZ/s1vQZaYjQ5Ew=\n-----END RSA PRIVATE KEY-----`,
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  },
  oauth: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
});

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
});

webhooks.onAny(({ id, name, payload }) => {
  console.log(name, "event received aka 2");
});

export const webhookMiddleware = createNodeMiddleware(webhooks, {
  path: "/api/v1/packagefox/webhooks",
  log: console,
});
