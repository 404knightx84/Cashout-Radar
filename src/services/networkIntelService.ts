interface AwsPrefix {
  ip_prefix: string;
  region: string;
  service: string;
}

interface GcpPrefix {
  ipv4Prefix?: string;
  service: string;
  scope: string;
}

export interface NetworkIntel {
  ip: string;
  isTorExit: boolean;
  cloudProvider?: string;
  cloudRegion?: string;
}

let feedPromise: Promise<NetworkIntel[]> | null = null;

function parseIpv4(ip: string): number | null {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256) + octets[3];
}

function isInCidr(ip: string, cidr: string): boolean {
  const [network, prefixLengthText] = cidr.split('/');
  const address = parseIpv4(ip);
  const networkAddress = parseIpv4(network);
  const prefixLength = Number(prefixLengthText);

  if (address === null || networkAddress === null || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  if (prefixLength === 0) return true;

  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  return (address & mask) === (networkAddress & mask);
}

async function loadNetworkFeeds(): Promise<NetworkIntel[]> {
  const [awsResponse, gcpResponse, torResponse] = await Promise.all([
    fetch('/geolocation/cloud_ip_ranges.json'),
    fetch('/geolocation/gcp_ip_ranges.json'),
    fetch('/geolocation/tor_exit_list.txt'),
  ]);

  if (!awsResponse.ok || !gcpResponse.ok || !torResponse.ok) {
    throw new Error('Network intelligence feeds are unavailable');
  }

  const awsData = await awsResponse.json() as { prefixes?: AwsPrefix[] };
  const gcpData = await gcpResponse.json() as { prefixes?: GcpPrefix[] };
  const torIps = (await torResponse.text())
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return [
    ...(awsData.prefixes ?? []).map(prefix => ({
      ip: prefix.ip_prefix,
      isTorExit: false,
      cloudProvider: prefix.service,
      cloudRegion: prefix.region,
    })),
    ...(gcpData.prefixes ?? [])
      .filter(prefix => prefix.ipv4Prefix)
      .map(prefix => ({
        ip: prefix.ipv4Prefix as string,
        isTorExit: false,
        cloudProvider: prefix.service,
        cloudRegion: prefix.scope,
      })),
    ...torIps.map(ip => ({ ip, isTorExit: true })),
  ];
}

function getFeeds() {
  feedPromise ??= loadNetworkFeeds();
  return feedPromise;
}

export async function lookupNetworkIntel(ip: string): Promise<NetworkIntel | null> {
  if (parseIpv4(ip) === null) return null;

  const feeds = await getFeeds();
  const matches = feeds.filter(feed => feed.isTorExit ? feed.ip === ip : isInCidr(ip, feed.ip));
  if (matches.length === 0) return { ip, isTorExit: false };

  const cloudMatch = matches.find(match => match.cloudProvider);
  return {
    ip,
    isTorExit: matches.some(match => match.isTorExit),
    cloudProvider: cloudMatch?.cloudProvider,
    cloudRegion: cloudMatch?.cloudRegion,
  };
}