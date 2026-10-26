package expo.modules.axonpackpreviewready

import java.io.InputStream

/** Hermes bytecode starts with an 8-byte magic number, then its format version as a 32-bit int. */
internal object HermesHeader {
  private val MAGIC = byteArrayOf(0xc6.toByte(), 0x1f, 0xbc.toByte(), 0x03, 0xc1.toByte(), 0x03, 0x19, 0x1f)

  /** Null for anything that is not Hermes bytecode, such as a plain JS bundle. */
  fun version(input: InputStream): Int? {
    val header = ByteArray(12)
    var read = 0
    while (read < header.size) {
      val n = input.read(header, read, header.size - read)
      if (n < 0) return null
      read += n
    }
    if (!header.copyOfRange(0, 8).contentEquals(MAGIC)) return null
    return (header[8].toInt() and 0xff) or
      ((header[9].toInt() and 0xff) shl 8) or
      ((header[10].toInt() and 0xff) shl 16) or
      ((header[11].toInt() and 0xff) shl 24)
  }
}
