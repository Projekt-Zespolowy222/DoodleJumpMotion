import { registerRootComponent } from "expo";
import React from "react";
import AppContent from "./App"; // путь к твоему App.tsx

// Класс-компонент, чтобы избежать ошибки Reanimated
export default class App extends React.Component {
  render() {
    return <AppContent />;
  }
}

// Регистрируем корневой компонент
registerRootComponent(App);
