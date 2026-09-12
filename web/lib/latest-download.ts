import { LINKS } from "@/lib/links";

type GithubAsset = {
  name: string;
  browser_download_url: string;
};

type GithubRelease = {
  assets?: GithubAsset[];
};

export async function resolveLatestWindowsInstaller(): Promise<string> {
  try {
    const response = await fetch("https://api.github.com/repos/manasdutta04/opennbLM/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return LINKS.download;
    const release = (await response.json()) as GithubRelease;
    const asset = release.assets?.find((item) => /win-x64\.exe$/i.test(item.name))
      ?? release.assets?.find((item) => /\.exe$/i.test(item.name));
    return asset?.browser_download_url ?? LINKS.download;
  } catch {
    return LINKS.download;
  }
}
