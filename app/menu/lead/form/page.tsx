import { redirect } from "next/navigation";

export default function LeadCreateRedirectPage() {
  redirect("/menu/lead?action=create");
}
