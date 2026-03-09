# @flownote/command-history

Framework-agnostic command-pattern undo/redo history manager.

Versioning: experimental `0.x` (breaking changes can ship in minor releases).

## Install

```bash
npm i @flownote/command-history
```

## API

- `Command` interface
- `History` class: `push`, `undo`, `redo`, `clear`, `canUndo`, `canRedo`
- Constructor options: `{ maxSize?: number }`

## Example

```ts
import { History, type Command } from "@flownote/command-history";

const history = new History({ maxSize: 200 });

const cmd: Command = {
  description: "Toggle flag",
  execute() {},
  undo() {},
};

history.push(cmd);
```
