import { Redis } from "@upstash/redis/cloudflare";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const hostname = url.hostname;
		const path = url.pathname + url.search;
		console.log('hostname', hostname);
		console.log('path', path);

		// We are only interested in subdomains of .microfox.app
		if (!hostname.endsWith('.microfox.app')) {
			return fetch(request);
		}

		// Extract the subdomain from the hostname, e.g., "reply-bots"
		const subdomain = hostname.split('.')[0];
		console.log('subdomain', subdomain);

		// If there is no subdomain, pass the request to the origin.
		if (!subdomain) {
			return fetch(request);
		}

		try {
			// Initialize the Redis client using the specific environment variables.
			const redis = new Redis({
				url: env.ROUTEMAP_UPSTASH_REDIS_REST_URL,
				token: env.ROUTEMAP_UPSTASH_REDIS_REST_TOKEN,
			});

			// Construct the key to look up in Redis.
			const redisKey = `subdomains:${subdomain}`;
			console.log('redisKey', redisKey);

			// Based on the CrudHash class, the data is a Redis Hash.
			// We must use `hget` to fetch the specific `urlsMap` field.
			// The `@upstash/redis` client automatically parses the JSON string.
			const urlsMap = await redis.hget(redisKey, 'urlsMap');
			console.log('urlsMap', JSON.stringify(urlsMap, null, 2));
			// Check if the result from Redis is a valid array.
			if (Array.isArray(urlsMap)) {
				// Find the most specific (longest) path that matches the start of the request path.
				const matchingRule = urlsMap
					.filter(rule => rule.path && path.startsWith(rule.path))
					.sort((a, b) => b.path.length - a.path.length)[0];
				console.log('matchingRule', JSON.stringify(matchingRule, null, 2));
				if (matchingRule) {
					// Determine the part of the path that comes after the matched rule's path.
					const remainingPath = path.substring(matchingRule.path.length);
					console.log('remainingPath', remainingPath);
					// Construct the final target URL by concatenating the base URL from the rule
					// with the rest of the path. This avoids the `new URL()` constructor's
					// behavior of replacing the base path.
					const targetUrl = matchingRule.url + remainingPath;
					console.log('targetUrl', targetUrl.toString());
					// Fetch the content from the rewritten URL and return the response.
					return fetch(targetUrl.toString(), request);
				}
			}
		} catch (error) {
			// Log the error but do not block the request.
			// The request will fall through to the origin.
			console.error(`Redis lookup failed for subdomain "${subdomain}":`, error);
			// If the Redis lookup fails, forward the request with an error parameter.
			const errorUrl = new URL(request.url);
			errorUrl.searchParams.set('routeError', `Redis lookup failed for ${subdomain}.`);
			return fetch(errorUrl.toString(), request);
		}

		// Fallback: If no dynamic route was found in Redis, or if Redis failed,
		// pass the original request to the origin server.
		return fetch(request);
	},
};
