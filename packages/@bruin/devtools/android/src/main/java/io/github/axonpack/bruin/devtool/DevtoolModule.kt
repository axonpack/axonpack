package io.github.axonpack.bruin.devtool

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DevtoolModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Devtool")
  }
}
