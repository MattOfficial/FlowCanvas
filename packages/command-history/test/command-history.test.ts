import { describe, expect, it } from "vitest";
import { History, type Command } from "../src/index";

type CounterCommand = Command & {
  executes: number;
  undoes: number;
};

function makeCounterCommand(description: string, target: { value: number }, delta: number): CounterCommand {
  const command: CounterCommand = {
    description,
    executes: 0,
    undoes: 0,
    execute() {
      command.executes += 1;
      target.value += delta;
    },
    undo() {
      command.undoes += 1;
      target.value -= delta;
    },
  };

  return command;
}

describe("command-history", () => {
  it("supports push, undo, redo flow", () => {
    const counter = { value: 0 };
    const history = new History();
    const cmd = makeCounterCommand("Increment", counter, 1);

    history.push(cmd);
    expect(counter.value).toBe(1);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    const undone = history.undo();
    expect(undone).toBe(cmd);
    expect(counter.value).toBe(0);
    expect(history.canRedo).toBe(true);

    const redone = history.redo();
    expect(redone).toBe(cmd);
    expect(counter.value).toBe(1);
    expect(cmd.executes).toBe(2);
    expect(cmd.undoes).toBe(1);
  });

  it("invalidates redo stack on new push", () => {
    const counter = { value: 0 };
    const history = new History();
    const plusOne = makeCounterCommand("Plus one", counter, 1);
    const plusTen = makeCounterCommand("Plus ten", counter, 10);

    history.push(plusOne);
    history.undo();
    expect(history.canRedo).toBe(true);

    history.push(plusTen);
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeNull();
    expect(counter.value).toBe(10);
  });

  it("evicts oldest commands when maxSize is exceeded", () => {
    const counter = { value: 0 };
    const history = new History({ maxSize: 2 });

    const a = makeCounterCommand("A", counter, 1);
    const b = makeCounterCommand("B", counter, 2);
    const c = makeCounterCommand("C", counter, 3);

    history.push(a);
    history.push(b);
    history.push(c);
    expect(counter.value).toBe(6);

    expect(history.undo()?.description).toBe("C");
    expect(history.undo()?.description).toBe("B");
    expect(history.undo()).toBeNull();
  });
});
