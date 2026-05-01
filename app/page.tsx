import Link from 'next/link'
import Header from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center text-[#0f3693] font-medium text-sm leading-relaxed mb-8 px-4 space-y-1">
          <p>Gracias por confiar en Zen Finance.</p>
          <p>Desde aquí puedes enviarnos tu documentación de forma segura y organizada.</p>
          <p>En pocos minutos tendremos todo listo para avanzar con tu hipoteca.</p>
        </div>
        <div className="flex flex-col gap-4">
          <Link href="/nuevo">
            <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 hover:shadow-lg hover:border-[#0f3693] border-2 border-transparent transition-all cursor-pointer">
              <div className="w-12 h-12 bg-[#0f3693] rounded-xl flex items-center justify-center text-2xl">📁</div>
              <div>
                <h2 className="font-semibold text-[#0f3693] text-lg">Nuevo expediente</h2>
                <p className="text-gray-500 text-sm">Soy cliente nuevo y quiero enviar mi documentación</p>
              </div>
            </div>
          </Link>
          <Link href="/expediente">
            <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 hover:shadow-lg hover:border-[#ffbeb8] border-2 border-transparent transition-all cursor-pointer">
              <div className="w-12 h-12 bg-[#ffbeb8] rounded-xl flex items-center justify-center text-2xl">🔁</div>
              <div>
                <h2 className="font-semibold text-gray-800 text-lg">Ya tengo expediente</h2>
                <p className="text-gray-500 text-sm">Ya soy cliente y quiero añadir documentos</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
