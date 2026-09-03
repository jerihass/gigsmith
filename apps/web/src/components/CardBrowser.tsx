import { useId } from "react";
import { RefreshCw } from "lucide-react";
import type {
  Card,
  Deck,
  DeckEditEvaluation,
  RamCompatibilityReport,
  ValidationIssue
} from "@gigsmith/data-contracts";
import {
  type CardColorFilter,
  type CardSetFilter,
  type CardSort,
  type CardTypeFilter,
  type DeckMembershipFilter,
  type NumberFilter,
  type RamCompatibilityFilter,
  type SellableFilter,
  type TextListFilter,
  type CardSetFilterOption
} from "../cardFilters";
import { selectExternalCardArtUrl } from "../externalCardArt";
import { hasDeckEntry } from "../deckEntries";
import { CardArt } from "./CardArt";
import { CardPreviewIdentity, CardPreviewStats, CardSetBadge } from "./CardPreviewStats";

const colorOptions: CardColorFilter[] = ["Any", "Red", "Yellow", "Green", "Blue"];
const typeOptions: CardTypeFilter[] = ["Any", "Legend", "Unit", "Program", "Gear"];
const sortOptions: CardSort[] = ["Snapshot", "Name", "Cost", "RAM", "Power", "Color", "Type"];
const membershipOptions: DeckMembershipFilter[] = ["All", "In Deck", "Not In Deck"];
const sellableOptions: SellableFilter[] = ["Any", "Sellable", "Not Sellable"];
const ramCompatibilityOptions: RamCompatibilityFilter[] = ["All", "Compatible", "Incompatible"];

export interface CardBrowserFilterChip {
  key: string;
  label: string;
  clear: () => void;
}

interface CardArtCoverage {
  available: number;
  total: number;
}

export interface CardBrowserProps {
  deck: Deck;
  decks: Deck[];
  deckLegal: boolean;
  deckIssueCount: number;
  filteredCards: Card[];
  deckCountById: ReadonlyMap<string, number>;
  ramCompatibilityById: ReadonlyMap<string, RamCompatibilityReport>;
  additionEvaluationById: ReadonlyMap<string, DeckEditEvaluation>;
  cardArtEnabled: boolean;
  cardArtUrls: ReadonlyMap<string, string>;
  cardArtCoverage: CardArtCoverage;
  cardArtSourceStatus: "idle" | "loading" | "ready" | "unavailable";
  onCardArtPreferenceChange: (enabled: boolean) => void;
  onRetryExternalCardArt: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  colorFilter: CardColorFilter;
  onColorFilterChange: (filter: CardColorFilter) => void;
  typeFilter: CardTypeFilter;
  onTypeFilterChange: (filter: CardTypeFilter) => void;
  ramFilter: NumberFilter;
  onRamFilterChange: (filter: NumberFilter) => void;
  costFilter: NumberFilter;
  onCostFilterChange: (filter: NumberFilter) => void;
  setFilter: CardSetFilter;
  onSetFilterChange: (filter: CardSetFilter) => void;
  classificationFilter: TextListFilter;
  onClassificationFilterChange: (filter: TextListFilter) => void;
  keywordFilter: TextListFilter;
  onKeywordFilterChange: (filter: TextListFilter) => void;
  sellableFilter: SellableFilter;
  onSellableFilterChange: (filter: SellableFilter) => void;
  membershipFilter: DeckMembershipFilter;
  onMembershipFilterChange: (filter: DeckMembershipFilter) => void;
  ramCompatibilityFilter: RamCompatibilityFilter;
  onRamCompatibilityFilterChange: (filter: RamCompatibilityFilter) => void;
  cardSort: CardSort;
  onCardSortChange: (sort: CardSort) => void;
  ramOptions: NumberFilter[];
  costOptions: NumberFilter[];
  setOptions: CardSetFilterOption[];
  classificationOptions: TextListFilter[];
  keywordOptions: TextListFilter[];
  advancedFiltersOpen: boolean;
  onAdvancedFiltersOpenChange: (open: boolean) => void;
  activeAdvancedFilterChips: CardBrowserFilterChip[];
  onClearAdvancedFilters: () => void;
  deckEditNotice?: ValidationIssue;
  onOpenCardDetails: (card: Card, trigger: HTMLButtonElement) => void;
  onAddLegend: (card: Card) => void;
  onRemoveLegend: (card: Card) => void;
  onAdjustMainCard: (card: Card, delta: number) => void;
  onSelectDeck: (deckId: string) => void;
  onGoToDeck: () => void;
}

function entryCount(entries: Deck["main"]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

export function CardBrowser({
  deck,
  decks,
  deckLegal,
  deckIssueCount,
  filteredCards,
  deckCountById,
  ramCompatibilityById,
  additionEvaluationById,
  cardArtEnabled,
  cardArtUrls,
  cardArtCoverage,
  cardArtSourceStatus,
  onCardArtPreferenceChange,
  onRetryExternalCardArt,
  query,
  onQueryChange,
  colorFilter,
  onColorFilterChange,
  typeFilter,
  onTypeFilterChange,
  ramFilter,
  onRamFilterChange,
  costFilter,
  onCostFilterChange,
  setFilter,
  onSetFilterChange,
  classificationFilter,
  onClassificationFilterChange,
  keywordFilter,
  onKeywordFilterChange,
  sellableFilter,
  onSellableFilterChange,
  membershipFilter,
  onMembershipFilterChange,
  ramCompatibilityFilter,
  onRamCompatibilityFilterChange,
  cardSort,
  onCardSortChange,
  ramOptions,
  costOptions,
  setOptions,
  classificationOptions,
  keywordOptions,
  advancedFiltersOpen,
  onAdvancedFiltersOpenChange,
  activeAdvancedFilterChips,
  onClearAdvancedFilters,
  deckEditNotice,
  onOpenCardDetails,
  onAddLegend,
  onRemoveLegend,
  onAdjustMainCard,
  onSelectDeck,
  onGoToDeck
}: CardBrowserProps) {
  const advancedFiltersId = useId();

  function openAdvancedFiltersFromMobileSearch() {
    onAdvancedFiltersOpenChange(true);
    window.requestAnimationFrame(() => document.getElementById(advancedFiltersId)?.scrollIntoView({ block: "nearest" }));
  }

  return (
    <section className="panel card-database-panel card-browser-panel" id="cards-browser">
      <div className="panel-title">
        <div>
          <p className="section-kicker">Card pool</p>
          <h2>Card Library</h2>
        </div>
        <div className="panel-actions card-database-actions">
          <label className="binary-field card-art-toggle" title="Loads artwork from the external card-data source">
            <input
              type="checkbox"
              checked={cardArtEnabled}
              onChange={(event) => onCardArtPreferenceChange(event.target.checked)}
            />
            <span>External art</span>
          </label>
          {cardArtEnabled && (
            <span className="result-count" aria-live="polite">
              {cardArtSourceStatus === "ready"
                ? `${cardArtCoverage.available} / ${cardArtCoverage.total} art`
                : cardArtSourceStatus === "loading" ? "Loading art" : "Art unavailable"}
            </span>
          )}
          {cardArtEnabled && (
            cardArtSourceStatus === "unavailable" ||
            (cardArtSourceStatus === "ready" && cardArtCoverage.available < cardArtCoverage.total)
          ) && (
            <button
              aria-label="Retry external artwork"
              className="icon-button"
              onClick={onRetryExternalCardArt}
              title="Retry external artwork"
              type="button"
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          )}
          <span className="result-count">{filteredCards.length} cards</span>
        </div>
      </div>

      <div className="card-browser-context">
        <label className="field card-browser-deck-picker">
          <span>Active deck</span>
          <select value={deck.id} onChange={(event) => onSelectDeck(event.target.value)}>
            {decks.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
            ))}
          </select>
        </label>
        <div className="card-browser-context-summary" aria-label="Active deck summary">
          <span className="card-browser-context-label">Adding to</span>
          <strong title={deck.name}>{deck.name}</strong>
          <span className="card-browser-deck-count">{entryCount(deck.main)} / 40-50</span>
          <span className={`card-browser-status ${deckLegal ? "legal" : "illegal"}`}>
            {deckLegal ? "Legal" : `${deckIssueCount} issue${deckIssueCount === 1 ? "" : "s"}`}
          </span>
        </div>
        <button className="card-browser-deck-action" onClick={onGoToDeck} type="button">Deck editor</button>
      </div>

      <div className="mobile-card-search-bar" role="search" aria-label="Card search">
        <label>
          <span>Search</span>
          <input
            id="mobile-card-search-input"
            aria-label="Search cards"
            placeholder="Name, text, faction..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <button
          aria-controls={advancedFiltersId}
          aria-expanded={advancedFiltersOpen}
          onClick={openAdvancedFiltersFromMobileSearch}
          type="button"
        >
          Filters{activeAdvancedFilterChips.length > 0 ? ` ${activeAdvancedFilterChips.length}` : ""}
        </button>
        <span aria-live="polite">{filteredCards.length}</span>
      </div>

      <div className="filter-grid">
        <label className="field search-field">
          <span>Search</span>
          <input placeholder="Name, text, faction..." value={query} onChange={(event) => onQueryChange(event.target.value)} />
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={cardSort} onChange={(event) => onCardSortChange(event.target.value as CardSort)}>
            {sortOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Deck</span>
          <select value={membershipFilter} onChange={(event) => onMembershipFilterChange(event.target.value as DeckMembershipFilter)}>
            {membershipOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <button
          aria-controls={advancedFiltersId}
          aria-expanded={advancedFiltersOpen}
          className="filter-toggle"
          onClick={() => onAdvancedFiltersOpenChange(!advancedFiltersOpen)}
          type="button"
        >
          Filters{activeAdvancedFilterChips.length > 0 ? ` ${activeAdvancedFilterChips.length}` : ""}
        </button>
        {activeAdvancedFilterChips.length > 0 && (
          <div className="filter-chips" aria-label="Active card filters">
            {activeAdvancedFilterChips.map((chip) => (
              <button aria-label={`Clear ${chip.label} filter`} key={chip.key} onClick={chip.clear} type="button">
                {chip.label}
                <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
        )}
        <div className="filter-secondary" data-expanded={advancedFiltersOpen ? "true" : "false"} id={advancedFiltersId}>
          <label className="field">
            <span>Color</span>
            <select value={colorFilter} onChange={(event) => onColorFilterChange(event.target.value as CardColorFilter)}>
              {colorOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value as CardTypeFilter)}>
              {typeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Set</span>
            <select value={setFilter} onChange={(event) => onSetFilterChange(event.target.value as CardSetFilter)}>
              {setOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>RAM</span>
            <select value={ramFilter} onChange={(event) => onRamFilterChange(event.target.value as NumberFilter)}>
              {ramOptions.map((option) => (
                <option key={option} value={option}>{option === "none" ? "None" : option}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Cost</span>
            <select value={costFilter} onChange={(event) => onCostFilterChange(event.target.value as NumberFilter)}>
              {costOptions.map((option) => (
                <option key={option} value={option}>{option === "none" ? "None" : option}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Classification</span>
            <select value={classificationFilter} onChange={(event) => onClassificationFilterChange(event.target.value as TextListFilter)}>
              {classificationOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          {keywordOptions.length > 1 && (
            <label className="field">
              <span>Keyword</span>
              <select value={keywordFilter} onChange={(event) => onKeywordFilterChange(event.target.value as TextListFilter)}>
                {keywordOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span>Sellable</span>
            <select value={sellableFilter} onChange={(event) => onSellableFilterChange(event.target.value as SellableFilter)}>
              {sellableOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="field">
            <span>RAM fit</span>
            <select
              value={ramCompatibilityFilter}
              onChange={(event) => onRamCompatibilityFilterChange(event.target.value as RamCompatibilityFilter)}
            >
              {ramCompatibilityOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <button className="filter-clear" disabled={activeAdvancedFilterChips.length === 0} onClick={onClearAdvancedFilters} type="button">
            Clear filters
          </button>
        </div>
      </div>

      {deckEditNotice && (
        <div
          className={`deck-edit-notice ${deckEditNotice.severity}`}
          role={deckEditNotice.severity === "error" ? "alert" : "status"}
        >
          {deckEditNotice.message}
        </div>
      )}

      <section aria-label="Card database results" className="card-list">
        {filteredCards.map((card) => {
          const legendSelected = card.card_type === "Legend" && hasDeckEntry(deck.legends, card.id);
          const deckCopies = deckCountById.get(card.id) ?? 0;
          const compatibility = ramCompatibilityById.get(card.id);
          const addition = additionEvaluationById.get(card.id);
          const atCopyLimit = addition?.blockers.some((blocker) => blocker.code === "max-copies") ?? false;
          return (
            <article aria-label={card.display_name} className="card-row" data-color={card.color.toLowerCase()} key={card.id}>
              <CardArt
                card={card}
                enabled={cardArtEnabled}
                source={selectExternalCardArtUrl(card, cardArtUrls)}
                sourcePending={cardArtSourceStatus === "loading"}
                variant="thumbnail"
              />
              <div className="card-copy">
                <strong className="card-title-line">
                  {legendSelected && (
                    <span className="deck-membership-badge" aria-label="Legend selected in deck">Selected</span>
                  )}
                  {!legendSelected && deckCopies > 0 && (
                    <span className="deck-membership-badge" aria-label={`${deckCopies} ${deckCopies === 1 ? "copy" : "copies"} in deck`}>
                      x{deckCopies}
                    </span>
                  )}
                  <span className="card-title-text">{card.display_name}</span>
                  <CardSetBadge card={card} />
                </strong>
                <span>
                  <CardPreviewIdentity card={card} /> · <CardPreviewStats card={card} />
                </span>
                {compatibility?.status === "compatible" && (
                  <small className="ram-compatibility compatible">RAM fit</small>
                )}
                {compatibility?.status === "incompatible" && (
                  <small className="ram-compatibility incompatible">
                    Over RAM · needs {compatibility.requiredRam}, has {compatibility.availableRam}
                  </small>
                )}
                {compatibility?.status === "unknown" && (
                  <small className="ram-compatibility unknown">RAM unknown</small>
                )}
              </div>
              <div className="card-actions">
                <button
                  className="card-details-action"
                  onClick={(event) => onOpenCardDetails(card, event.currentTarget)}
                  type="button"
                >Details</button>
                {card.card_type === "Legend" ? (
                  legendSelected ? (
                    <button onClick={() => onRemoveLegend(card)} type="button">Remove</button>
                  ) : (
                    <button onClick={() => onAddLegend(card)} type="button">Add Legend</button>
                  )
                ) : (
                  <div className="card-action-group">
                    <button
                      disabled={deckCopies === 0}
                      aria-label={`Remove one ${card.display_name}`}
                      title={deckCopies > 0 ? "Remove one" : "Not in deck"}
                      onClick={() => onAdjustMainCard(card, -1)}
                      className="card-remove-copy-action"
                      type="button"
                    >−</button>
                    <button
                      disabled={!addition?.allowed}
                      aria-label={addition?.allowed
                        ? undefined
                        : `${atCopyLimit ? `Max ${addition?.maxCopies}` : "+ Main"}${addition?.blockers[0]?.message ? ` — ${addition.blockers[0].message}` : ""}`}
                      title={addition?.blockers[0]?.message}
                      onClick={() => onAdjustMainCard(card, 1)}
                      type="button"
                    >{atCopyLimit ? `Max ${addition?.maxCopies}` : "+ Main"}</button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {filteredCards.length === 0 && (
          <div className="empty-state">No cards match the current filters.</div>
        )}
      </section>
    </section>
  );
}
