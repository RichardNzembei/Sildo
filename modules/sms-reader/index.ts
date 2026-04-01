import { requireNativeModule } from "expo-modules-core";

interface SmsMessage {
  body: string;
  date: number;
}

const SmsReader = requireNativeModule("SmsReader");

export async function readSms(
  address: string,
  maxCount: number = 5000
): Promise<SmsMessage[]> {
  return SmsReader.readSms(address, maxCount);
}
