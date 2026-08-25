"use client";

import { useEffect, useState } from "react";
import { shortAddr } from "@/lib/config";
import { useManagerSettings } from "@/lib/managerSettings";

export default function ManagerField() {
  const { manager, startBlock, save, clear } = useManagerSettings();
  const [addressDraft, setAddressDraft] = useState("");
  const [blockDraft, setBlockDraft] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    setAddressDraft(manager ?? "");
    setBlockDraft(startBlock !== undefined ? startBlock.toString() : "");
  }, [manager, startBlock]);

  function onSave() {
    const err = save(addressDraft, blockDraft);
    setError(err);
  }

  return (
    <section className="wallet-bar" aria-label="Listing manager">
      <p className="wallet-bar-copy">
        After proposal 992 executes, paste the listing manager address. Saved on this phone only.
      </p>
      <form
        className="manager-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label className="manager-label">
          Manager address
          <input
            className="op-input manager-input"
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="0x…"
            value={addressDraft}
            onChange={(e) => {
              setAddressDraft(e.target.value);
              setError(undefined);
            }}
            aria-invalid={Boolean(error)}
          />
        </label>
        {error && (
          <p className="op-error" role="alert">
            {error}
          </p>
        )}
        <label className="manager-label">
          Start block (optional)
          <input
            className="op-input manager-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="deploy block"
            value={blockDraft}
            onChange={(e) => {
              setBlockDraft(e.target.value);
              setError(undefined);
            }}
          />
        </label>
        <div className="wallet-bar-actions">
          <button type="submit" className="btn">
            Save on this phone
          </button>
          {manager && (
            <button type="button" className="btn" onClick={clear}>
              Clear
            </button>
          )}
        </div>
        {manager && (
          <p className="muted">
            Using {shortAddr(manager)}
            {startBlock !== undefined ? ` from block ${startBlock.toString()}` : ""}.
          </p>
        )}
      </form>
    </section>
  );
}
