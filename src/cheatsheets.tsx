import { clearSearchBar, Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { adaptMarkdownForDisplay } from "./utils/MarkdownCompatibility";
import { searchSnippets } from "./utils/SnippetSearch";
import CustomActionPanel, { SnippetContentActions } from "./components/CustomActionPanel";
import { extractHeadings, extractSectionContent } from "./utils/DocumentHeadings";
import type { Snippet, State, Heading } from "./types";
import {
  clearUnusedSnippets,
  orderSnippets,
  storeLastCopied,
  loadReaderState,
  saveReaderState,
  type ReaderState,
} from "./utils/LocalStorageHelper";
import { expandHomeDirectory, loadAllSnippets } from "./utils/SnippetsLoader";

const headingCache = new WeakMap<Snippet, Heading[]>();

export default function Command() {
  const [state, setState] = useState<State>({ snippets: [], isLoading: true });
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [selectedHeading, setSelectedHeading] = useState<Heading | null>(null);

  const [searchText, setSearchText] = useState("");
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
  const [headingSearchText, setHeadingSearchText] = useState("");

  const [readerState, setReaderState] = useState<ReaderState>({ favorites: [], bookmarks: {}, reading: {} });
  const readerRef = useRef(readerState);
  const readerDirty = useRef(false);
  const readerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadGeneration = useRef(0);
  const persistReader = (next: ReaderState, immediate = false) => {
    readerRef.current = next;
    readerDirty.current = true;
    setReaderState(next);
    clearTimeout(readerTimer.current);
    const save = () => {
      void saveReaderState(readerRef.current).catch((error) => console.error("Reader state save failed", error));
    };
    if (immediate) save();
    else readerTimer.current = setTimeout(save, 400);
  };
  useEffect(
    () => () => {
      clearTimeout(readerTimer.current);
      if (readerDirty.current) void saveReaderState(readerRef.current).catch(console.error);
    },
    [],
  );
  const rememberHeading = (heading: Heading, query: string) => {
    if (!selectedSnippet) return;
    const current = readerRef.current;
    persistReader({
      ...current,
      reading: { ...current.reading, [selectedSnippet.id]: { headingId: heading.id, headingSearch: query } },
    });
  };
  const toggleFavorite = (snippet: Snippet) => {
    const current = readerRef.current;
    persistReader(
      {
        ...current,
        favorites: current.favorites.includes(snippet.id)
          ? current.favorites.filter((id) => id !== snippet.id)
          : [...current.favorites, snippet.id],
      },
      true,
    );
  };
  const toggleBookmark = (heading: Heading) => {
    if (!selectedSnippet) return;
    const current = readerRef.current;
    const bookmarks = current.bookmarks[selectedSnippet.id] ?? [];
    persistReader(
      {
        ...current,
        bookmarks: {
          ...current.bookmarks,
          [selectedSnippet.id]: bookmarks.includes(heading.id)
            ? bookmarks.filter((id) => id !== heading.id)
            : [...bookmarks, heading.id],
        },
      },
      true,
    );
  };

  const clearCurrentSearch = () => {
    void clearSearchBar({ forceScrollToTop: false }).catch(console.error);
    if (selectedSnippet) {
      setHeadingSearchText("");
      if (selectedHeading) rememberHeading(selectedHeading, "");
    } else setSearchText("");
  };

  const handleAction = async function (snippet: Snippet) {
    clearCurrentSearch();
    const sourceSnippets = state.snippets;
    const sourceFiltered = state.filteredSnippets;
    const sourceFilter = state.selectedFilter;
    const generation = loadGeneration.current;
    try {
      await storeLastCopied(snippet);

      const orderedSnippets = await orderSnippets(state.snippets ?? []);
      const filteredSnippets = await orderSnippets(state.filteredSnippets ?? state.snippets ?? []);
      setState((previous) => {
        if (
          generation !== loadGeneration.current ||
          previous.snippets !== sourceSnippets ||
          previous.filteredSnippets !== sourceFiltered ||
          previous.selectedFilter !== sourceFilter
        )
          return previous;
        return { ...previous, snippets: orderedSnippets, filteredSnippets };
      });
    } catch (error) {
      console.error("History save failed", error);
    }
  };

  // Prepare the detail page before navigation; never render an empty intermediate page.
  const handleSelectSnippet = async (snippet: Snippet) => {
    // Tinycast retains native search independently of the controlled List props.
    await clearSearchBar({ forceScrollToTop: false });
    let extractedHeadings = headingCache.get(snippet);
    if (!extractedHeadings) {
      extractedHeadings = extractHeadings(snippet.content.content);
      headingCache.set(snippet, extractedHeadings);
    }
    const savedReading = readerRef.current.reading[snippet.id];
    const firstSection =
      extractedHeadings.find((heading) => heading.id === savedReading?.headingId) ??
      extractedHeadings.find(
        (heading, index) => !extractedHeadings[index + 1] || extractedHeadings[index + 1].level <= heading.level,
      ) ??
      extractedHeadings[0] ??
      null;
    if (firstSection) {
      const current = readerRef.current;
      persistReader({
        ...current,
        reading: {
          ...current.reading,
          [snippet.id]: { headingId: firstSection.id, headingSearch: "" },
        },
      });
    }
    setHeadings(extractedHeadings);
    setSelectedHeading(firstSection);
    setHeadingSearchText("");
    setActiveSnippetId(snippet.id);
    setSearchText("");
    setSelectedSnippet(snippet);
  };

  // 返回到 snippets 列表
  const handleBackToSnippets = () => {
    clearCurrentSearch();
    clearTimeout(readerTimer.current);
    if (readerDirty.current) void saveReaderState(readerRef.current).catch(console.error);
    setSelectedSnippet(null);
  };

  // Initial data fetch
  const fetchData = async () => {
    const generation = ++loadGeneration.current;
    setState((previous) => ({ ...previous, isLoading: true }));
    try {
      const savedReader = await loadReaderState();
      if (!readerDirty.current) {
        readerRef.current = savedReader;
        setReaderState(savedReader);
      }
      const preferences = getPreferenceValues();
      const path = preferences["folderPath"];
      const allPathsTmp = preferences["secondaryFolderPaths"]
        ? [path, ...preferences["secondaryFolderPaths"].split(",")]
        : [path];
      const allPaths = Array.from(
        new Set(allPathsTmp.map((folder: string) => expandHomeDirectory(folder.trim())).filter(Boolean)),
      );

      const snippetsPromises = allPaths.map(loadAllSnippets);
      const snippetsArrays = await Promise.all(snippetsPromises);
      const snippets = Array.from(
        new Map(snippetsArrays.flatMap(({ snippets }) => snippets).map((snippet) => [snippet.id, snippet])).values(),
      );
      const errors = snippetsArrays.flatMap(({ errors }) => errors);

      const folders = Array.from(
        new Set(
          snippets.map((i) => {
            return i.folder;
          }),
        ),
      );

      const tags = Array.from(
        new Set(
          snippets.flatMap((i) => {
            return i.content.tags ?? [];
          }),
        ),
      );

      await clearUnusedSnippets(snippets);
      const orderedSnippets = await orderSnippets(snippets);
      if (generation !== loadGeneration.current) return;

      setState((previous) => ({
        ...previous,
        snippets: orderedSnippets,
        filteredSnippets: orderedSnippets,
        folders: folders,
        tags: tags,
        paths: allPaths,
        errors: errors,
        primaryAction: preferences["primaryAction"],
      }));
    } catch (err) {
      if (generation !== loadGeneration.current) return;
      setState((previous) => ({
        ...previous,
        errors: [err instanceof Error ? err : new Error("Something went wrong")],
      }));
    }

    if (generation === loadGeneration.current) setState((previous) => ({ ...previous, isLoading: false }));
  };
  useEffect(() => {
    fetchData();
  }, []);

  // Handle filter folder
  // Use the latest state, including asynchronously loaded snippets.
  useEffect(() => {
    setState((previous) => {
      const filter = previous.selectedFilter;
      const snippets = previous.snippets ?? [];
      let filteredSnippets = snippets;

      if (filter?.startsWith("folder:")) {
        filteredSnippets = snippets.filter((snippet) => snippet.folder === filter.substring(7));
      } else if (filter?.startsWith("tag:")) {
        filteredSnippets = snippets.filter((snippet) => snippet.content.tags?.includes(filter.substring(4)));
      }

      return { ...previous, filteredSnippets };
    });
  }, [state.selectedFilter, state.snippets]);

  // Extract headings before switching pages, rather than in a deferred effect.

  const visibleSnippets = useMemo(
    () =>
      searchSnippets(
        state.selectedFilter === "favorites"
          ? (state.snippets ?? []).filter((snippet) => readerState.favorites.includes(snippet.id))
          : (state.filteredSnippets ?? []),
        searchText,
      ),
    [state.filteredSnippets, state.snippets, state.selectedFilter, searchText, readerState.favorites],
  );
  const activeSnippet = visibleSnippets.find((snippet) => snippet.id === activeSnippetId) ?? visibleSnippets[0];
  const activeHeading = selectedHeading ?? headings[0];
  const selectedSectionContent = useMemo(
    () =>
      selectedSnippet && activeHeading ? extractSectionContent(selectedSnippet.content.content, activeHeading) : "",
    [selectedSnippet, activeHeading],
  );

  // Parent headings preview their own introduction, not every descendant section.
  const selectedSectionMarkdown = useMemo(
    () =>
      selectedSnippet && activeHeading
        ? adaptMarkdownForDisplay(extractSectionContent(selectedSnippet.content.content, activeHeading, true))
        : "",
    [selectedSnippet, activeHeading],
  );

  useEffect(() => {
    if (state.errors?.length)
      void showToast({
        style: Toast.Style.Failure,
        title: "Some documents could not be loaded",
        message: state.errors.slice(0, 5).map(String).join("\n"),
      }).catch(console.error);
  }, [state.errors]);

  // If a snippet is selected, show the headings list with detail
  if (selectedSnippet) {
    return (
      <List
        key="headings"
        navigationTitle={selectedSnippet.name}
        searchText={headingSearchText}
        onSearchTextChange={(query) => {
          setHeadingSearchText(query);
          if (activeHeading) rememberHeading(activeHeading, query);
        }}
        filtering={true}
        throttle={false}
        selectedItemId={activeHeading?.id}
        searchBarPlaceholder="Search headings..."
        isShowingDetail
        onSelectionChange={(id) => {
          if (id) {
            const heading = headings.find((h) => h.id === id);
            if (heading && heading.id !== activeHeading?.id) {
              setSelectedHeading(heading);
              rememberHeading(heading, headingSearchText);
            }
          }
        }}
        actions={
          <ActionPanel>
            <Action title="Back to Snippets" icon={Icon.ArrowLeft} onAction={handleBackToSnippets} />
          </ActionPanel>
        }
      >
        {headings.length === 0 ? (
          <List.EmptyView
            icon={Icon.Document}
            title="No headings found"
            description="This document doesn't contain any headings."
            actions={
              <ActionPanel>
                <Action title="Back to Snippets" icon={Icon.ArrowLeft} onAction={handleBackToSnippets} />
                <Action.CopyToClipboard
                  title="Copy Content"
                  content={selectedSnippet.content.content}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.Paste
                  title="Paste to Active App"
                  content={selectedSnippet.content.content}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }} // 修改为 cmd+shift+p
                />
              </ActionPanel>
            }
          />
        ) : (
          headings.map((heading) => (
            <List.Item
              key={heading.id} // 使用唯一ID作为key
              id={heading.id} // 使用唯一ID作为id，而不是text
              title={heading.text}
              icon={Icon.Circle}
              accessories={[
                ...(readerState.bookmarks[selectedSnippet.id]?.includes(heading.id)
                  ? [{ icon: Icon.Bookmark, tooltip: "Bookmarked section" }]
                  : []),
                { text: "H" + heading.level },
              ]}
              detail={
                activeHeading?.id === heading.id ? (
                  <List.Item.Detail
                    markdown={selectedSectionMarkdown}
                    metadata={
                      selectedSnippet.content.tags && selectedSnippet.content.tags.length > 0 ? (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Tags">
                            {selectedSnippet.content.tags.map((tag, tagIndex) => (
                              <List.Item.Detail.Metadata.TagList.Item text={tag} key={`tag-${tag}-${tagIndex}`} />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        </List.Item.Detail.Metadata>
                      ) : null
                    }
                  />
                ) : undefined
              }
              actions={
                activeHeading?.id === heading.id ? (
                  <ActionPanel>
                    <Action title="Back to Snippets" icon={Icon.ArrowLeft} onAction={handleBackToSnippets} />
                    <Action
                      title={
                        readerState.bookmarks[selectedSnippet.id]?.includes(heading.id)
                          ? "Remove Section Bookmark"
                          : "Bookmark Section"
                      }
                      icon={Icon.Bookmark}
                      onAction={() => toggleBookmark(heading)}
                    />
                    <Action
                      title={
                        readerState.favorites.includes(selectedSnippet.id) ? "Unfavorite Document" : "Favorite Document"
                      }
                      icon={Icon.Star}
                      onAction={() => toggleFavorite(selectedSnippet)}
                    />
                    {(readerState.bookmarks[selectedSnippet.id] ?? []).length > 0 && (
                      <ActionPanel.Section title="Bookmarked Sections">
                        {headings
                          .filter((item) => readerState.bookmarks[selectedSnippet.id]?.includes(item.id))
                          .map((item) => (
                            <Action
                              key={item.id}
                              title={item.text}
                              icon={Icon.Bookmark}
                              onAction={() => {
                                setHeadingSearchText("");
                                setSelectedHeading(item);
                                rememberHeading(item, "");
                              }}
                            />
                          ))}
                      </ActionPanel.Section>
                    )}
                    {state.primaryAction === "pasteToActiveApp" && (
                      <Action.Paste
                        title="Paste Section to Active App"
                        content={selectedSectionContent}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        onPaste={() => handleAction(selectedSnippet)}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Section"
                      onCopy={() => handleAction(selectedSnippet)}
                      content={selectedSectionContent}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Full Content"
                      onCopy={() => handleAction(selectedSnippet)}
                      content={selectedSnippet.content.content}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
          ))
        )}
      </List>
    );
  }

  // Main snippets list
  const loadSnippetsView = visibleSnippets.length > 0;
  return (
    <List
      key="snippets"
      searchBarPlaceholder="Type to search snippets"
      filtering={false}
      throttle={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setActiveSnippetId}
      selectedItemId={activeSnippet?.id ?? null}
      isLoading={state.isLoading}
      searchBarAccessory={
        <List.Dropdown
          value={state.selectedFilter ?? "all"}
          tooltip="Filter on folder"
          storeValue={true}
          onChange={(newValue) => {
            setState((previous) => ({ ...previous, selectedFilter: newValue }));
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
          {state.folders && state.folders.length != 1 && (
            <List.Dropdown.Section title="Folders">
              {state.folders.map((i, index) => {
                return <List.Dropdown.Item title={i} value={`folder:${i}`} key={`folder-${i}-${index}`} />;
              })}
            </List.Dropdown.Section>
          )}
          {state.tags && state.tags.length != 0 && (
            <List.Dropdown.Section title="Tags">
              {state.tags.map((i, index) => {
                return <List.Dropdown.Item title={i} value={`tag:${i}`} key={`tag-${i}-${index}`} />;
              })}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {!loadSnippetsView && (
        <List.EmptyView
          icon={Icon.Snippets}
          title="No Snippets."
          description="Why not create a few?

            Visit https://www.raycast.com/astronight/snippetsurfer for examples."
          actions={
            <ActionPanel>
              <Action
                title="Reload Snippets"
                icon={Icon.RotateAntiClockwise}
                onAction={fetchData}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      )}
      {loadSnippetsView &&
        visibleSnippets.map((i) => {
          return (
            <List.Item
              id={i.id}
              key={i.id}
              title={i.name}
              accessories={[
                ...(readerState.favorites.includes(i.id) ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
                ...(readerState.reading[i.id] ? [{ icon: Icon.Bookmark, tooltip: "Continue reading" }] : []),
                { icon: Icon.Folder, text: i.folder && i.folder !== "." ? i.folder : "" },
              ]}
              icon={Icon.Document}
              actions={
                <ActionPanel>
                  {activeSnippet?.id === i.id && !!state.primaryAction && (
                    <SnippetContentActions
                      snippet={i}
                      primaryAction={state.primaryAction}
                      handleAction={handleAction}
                    />
                  )}
                  <Action
                    title="Open"
                    icon={Icon.Eye}
                    onAction={() => handleSelectSnippet(i)} // 使用新的处理函数
                  />
                  {activeSnippet?.id === i.id && (
                    <Action
                      title={readerState.favorites.includes(i.id) ? "Unfavorite Document" : "Favorite Document"}
                      icon={Icon.Star}
                      onAction={() => toggleFavorite(i)}
                    />
                  )}
                  {activeSnippet?.id === i.id && (
                    <CustomActionPanel
                      handleAction={handleAction}
                      snippet={i}
                      primaryAction={state.primaryAction ?? ""}
                      reloadSnippets={fetchData}
                      paths={state.paths ?? []}
                      showContentActions={!state.primaryAction}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
