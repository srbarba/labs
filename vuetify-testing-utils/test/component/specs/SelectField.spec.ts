import { getSelectField } from "@/index";
import { it, render, screen, expect } from "@@/test/utils";
import { VSelect } from "vuetify/components";

it("should get the select field", async () => {
  const selectFieldLabel = "SelectFixture";
  render(VSelect, {
    props: {
      label: selectFieldLabel,
      items: ["foo", "bar", "baz"],
    },
  });

  const selectField = await getSelectField(screen, selectFieldLabel);
  await selectField.open();

  const selectOption = "bar";
  await selectField.selectOption(selectOption);
  expect(selectField.value).toBe(selectOption);
});
