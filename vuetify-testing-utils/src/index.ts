import type { Screen } from "@testing-library/vue";
import { within } from "@testing-library/vue";
import { userEvent } from "@testing-library/user-event";

export async function getSelectField(screen: Screen, name: string) {
  const selectInput = await screen.findByLabelText(name);
  const selectField = selectInput.closest('[role="combobox"]');
  if (!selectField) throw new Error("Select field not found");

  return {
    get value() {
      return selectInput.getAttribute("value");
    },
    open() {
      return userEvent.click(selectField);
    },
    async selectOption(value: string) {
      const selectItemsId = selectField.getAttribute("aria-owns");
      if (!selectItemsId) throw new Error("Select items id not found");

      const listbox = document.querySelector(`#${selectItemsId}`);
      if (!listbox || !(listbox instanceof HTMLElement)) {
        throw new Error(`Listbox with id ${selectItemsId} not found`);
      }

      const option = await within(listbox).findByRole("option", {
        name: value,
      });
      return userEvent.click(option);
    },
  };
}
