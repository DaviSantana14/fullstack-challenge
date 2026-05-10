import { beforeAll } from "bun:test";
import React from "react";
import ReactDOM from "react-dom/client";

// Import happy-dom after React
const { Window } = await import("happy-dom");
const window = new Window() as unknown as Window & typeof globalThis;

// Assign globals before any testing-library import
(globalThis as Record<string, unknown>).document = window.document;
(globalThis as Record<string, unknown>).window = window;
(globalThis as Record<string, unknown>).localStorage = window.localStorage;
(globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
(globalThis as Record<string, unknown>).Element = window.Element;
(globalThis as Record<string, unknown>).navigator = window.navigator;
(globalThis as Record<string, unknown>).requestAnimationFrame = window.requestAnimationFrame;
(globalThis as Record<string, unknown>).cancelAnimationFrame = window.cancelAnimationFrame;

// Pre-load React into happy-dom window
(window as Record<string, unknown>).React = React;
(window as Record<string, unknown>).ReactDOM = ReactDOM;

// Extend matchers
import "@testing-library/jest-dom";
