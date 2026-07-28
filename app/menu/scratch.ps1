
$content = Get-Content -Path .\owner-outlet\[id]\page.tsx -Raw

$content = $content -replace "code: `"`", name: `"`", phone: `"`", address: `"`"", "code: `"`", name: `"`", phone: `"`", province: `"`", city: `"`", address: `"`""
$content = $content -replace "setAddForm\(\{ code: `"`", name: `"`", phone: `"`", address: `"`" \}\);", "setAddForm({ code: `"`", name: `"`", phone: `"`", province: `"`", city: `"`", address: `"`" });"

# Update Code Outlet label
$content = $content -replace "Kode Outlet <span className=`"text-gray-400 text-\[10px\] normal-case tracking-normal`">\(Opsional\)</span>", "Kode Outlet <span className=`"text-[#C92C1E]`">*</span>"

# Make Code input required
$content = $content -replace "className=`"w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-\[#C92C1E\] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900`"`n                    disabled=\{isSubmitting\}", "className=`"w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900`"`n                    required`n                    disabled={isSubmitting}"

# Add province and city fields
$insertStr = @"
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Provinsi <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={addForm.province}
                      onChange={(e) => setAddForm({...addForm, province: e.target.value})}
                      placeholder="Contoh: DKI Jakarta"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Kota/Kabupaten <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={addForm.city}
                      onChange={(e) => setAddForm({...addForm, city: e.target.value})}
                      placeholder="Contoh: Jakarta Pusat"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
"@

$content = $content -replace "                <div>`n                  <label className=`"block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide`">`n                    Alamat Lengkap", $insertStr + "                  <label className=`"block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide`">`n                    Alamat Lengkap"

# Change language of submit button state
$content = $content -replace "Menyimpan...", "Menyimpan Outlet..."
$content = $content -replace "Simpan Outlet", "Simpan Outlet Baru"

Set-Content -Path .\owner-outlet\[id]\page.tsx -Value $content

