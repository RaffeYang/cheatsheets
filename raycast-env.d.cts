/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Select Primary Snippet Folder - Select the primary folder where snippets are located. */
  "folderPath": string,
  /** Select Secondary Snippet Folders - Comma separated list of additional paths where snippets are located.
Example: ~/Desktop/snippets,~/Documents/othersnippets */
  "secondaryFolderPaths"?: string,
  /** Select primary action - Primary action. */
  "primaryAction"?: "copyClipboard" | "pasteToActiveApp"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `cheatsheets` command */
  export type Cheatsheets = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `cheatsheets` command */
  export type Cheatsheets = {}
}

