"use client"

import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-16 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-primary font-bold text-lg mb-4">Rifas Online</h3>
            <p className="text-muted-foreground text-sm">Plataforma de rifas online segura y transparente</p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Navegación</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/raffles" className="text-muted-foreground hover:text-primary transition">
                  Rifas
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">Email: info@rifas.com</li>
              <li className="text-muted-foreground">Teléfono: +1 (555) 123-4567</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-muted-foreground text-sm">
          <p>&copy; 2025. Todos los derechos reservados. Desarrollo y diseño by Jercol Techs.</p>
        </div>
      </div>
    </footer>
  )
}
