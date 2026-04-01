package expo.modules.smsreader

import android.content.ContentResolver
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsReaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    AsyncFunction("readSms") { address: String, maxCount: Int ->
      val context = appContext.reactContext ?: throw Exception("Context not available")
      val resolver: ContentResolver = context.contentResolver
      val uri = Uri.parse("content://sms/inbox")

      val messages = mutableListOf<Map<String, Any?>>()

      val cursor = resolver.query(
        uri,
        arrayOf("_id", "address", "body", "date"),
        "address LIKE ?",
        arrayOf("%$address%"),
        "date DESC"
      )

      cursor?.use {
        val bodyIdx = it.getColumnIndexOrThrow("body")
        val dateIdx = it.getColumnIndexOrThrow("date")
        var count = 0

        while (it.moveToNext() && count < maxCount) {
          val body = it.getString(bodyIdx) ?: ""
          val date = it.getLong(dateIdx)

          messages.add(mapOf(
            "body" to body,
            "date" to date
          ))
          count++
        }
      }

      return@AsyncFunction messages
    }
  }
}
