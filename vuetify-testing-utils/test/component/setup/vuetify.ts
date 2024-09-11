import { config } from "@vue/test-utils";
import { createVuetify } from "vuetify";

config.global.plugins.push(createVuetify());
// @ts-ignore
global.ResizeObserver = require("resize-observer-polyfill");
