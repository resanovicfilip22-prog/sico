import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2 text-muted-foreground leading-relaxed">
        {children}
      </CardContent>
    </Card>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{n}</span>
      <div>{children}</div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Upute za korištenje</h1>
        <p className="text-muted-foreground mt-1 text-sm">Referentni vodič za administraciju košarkaške lige</p>
      </div>

      <Section title="🗓 Tijek rada — tipična sezona">
        <div className="space-y-3">
          <Step n={1}><strong>Sezone</strong> → Nova sezona → postavi kao aktivnu</Step>
          <Step n={2}><strong>Ekipe</strong> → dodaj ekipe → otvori sezonu → dodaj ekipe u sezonu</Step>
          <Step n={3}><strong>Igrači</strong> → dodaj igrače → <em>Dodijeli igrača ekipi</em> (sezona + ekipa + broj dresa)</Step>
          <Step n={4}><strong>Kola</strong> → <Badge variant="default" className="text-xs">⚡ Generiraj raspored</Badge> → postavi datume po kolima</Step>
          <Step n={5}><strong>Utakmice</strong> → za svaku utakmicu: <Badge variant="outline" className="text-xs">● Live</Badge> → unosi rezultat i statistike uživo</Step>
          <Step n={6}>Nakon utakmice: <Badge variant="outline" className="text-xs">Statistika</Badge> → provjeri i nadopuni detalje</Step>
          <Step n={7}>Po završetku regularnog dijela: <strong>Playoff</strong> → generiraj bracket</Step>
        </div>
      </Section>

      <Section title="🏀 Sezone">
        <p>Jedna sezona može biti <strong>aktivna</strong> — to je sezona koja se prikazuje na javnoj stranici po defaultu. Ostale su dostupne u arhivi.</p>
        <p>Pri kreiranju nove sezone možeš kopirati roster ekipa iz prethodne sezone da ne moraš sve unositi iznova.</p>
        <p>Postavi <em>Broj ekipa u playoffu</em> prije generiranja playoff bracketa.</p>
      </Section>

      <Section title="👥 Ekipe i igrači">
        <p><strong>Ekipe</strong> — kratice (max 4 znaka) koriste se u box scoreu i rezultatima. Jednom dodana ekipa ostaje u sustavu i može sudjelovati u više sezona.</p>
        <p><strong>Igrači</strong> — igrač se doda jednom, a zatim se <em>dodjeljuje</em> ekipi po sezoni s brojem dresa. Isti igrač može biti u različitim ekipama u različitim sezonama.</p>
        <p>Da dodaš igrača u roster: <em>Dodijeli igrača ekipi</em> ili klikni <code>+</code> pored igrača u tablici.</p>
      </Section>

      <Section title="📅 Kola i raspored">
        <p>Gumb <strong>⚡ Generiraj raspored</strong> automatski kreira kola i utakmice koristeći algoritam kružnog turnira (round-robin), tako da svaka ekipa igra sa svakom točno 2 puta.</p>
        <p>Za <strong>neparan broj ekipa</strong> — algoritam dodaje "slobodan termin" pa jedna ekipa svako kolo nema protivnika. To je normalno ponašanje.</p>
        <p>Nakon generiranja: otvori svako kolo i postavi <strong>datum i vrijeme</strong> za svaku utakmicu.</p>
        <p>Sustav sprječava da iste dvije ekipe igraju više od 2 puta ukupno. Ručno dodavanje trećeg susreta iste kombinacije nije moguće.</p>
      </Section>

      <Section title="🔴 Live unos rezultata">
        <p>U sekciji Utakmice klikni <Badge variant="outline" className="text-xs">● Live</Badge> pored zakazane utakmice.</p>
        <p>Na Live stranici:</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Gornji dio — ručni unos bodova timova (+1/+2/+3/−1)</li>
          <li>Donji dio — statistike po igraču: klikni igrača, zatim odaberi akciju (2P ✓, 2P ✗, SK+, As...)</li>
          <li>Statistike su <strong>vidljive gledateljima uživo</strong> na javnoj stranici utakmice</li>
          <li>Rezultat se ažurira u realnom vremenu za sve koji imaju otvorenu stranicu</li>
        </ul>
        <p>Klik <strong>Završi utakmicu</strong> postavlja utakmicu kao završenu i preusmjerava na unos detalja statistike.</p>
      </Section>

      <Section title="📊 Unos statistike">
        <p>Dostupno putem gumba <Badge variant="outline" className="text-xs">Statistika</Badge> kod završenih utakmica.</p>
        <p>Unosi: 2P/3P/SB pogoci i pokušaji, skokovi (napadački/obrambeni), asistencije, izgubljene lopte, ukradene lopte, blokade, osobne pogreške, +/−.</p>
        <p><strong>Bodovi i VAL</strong> se računaju automatski — ne unosiš ih ručno.</p>
        <p>Ako zbroj bodova igrača <strong>ne odgovara</strong> unesenom rezultatu utakmice — sustav prikazuje upozorenje, a statistike <em>neće biti vidljive javnosti</em> dok se ne usklade.</p>
        <p>Crvena bordura na unosu = pogoci &gt; pokušaji. Provjeri te retke prije spremanja.</p>
      </Section>

      <Section title="🏆 Playoff">
        <p>Idi na <strong>Playoff</strong> → klikni <em>Generiraj bracket</em>. Sustav automatski uzima top N ekipa s ljestvice i kreira bracket.</p>
        <p>Playoff koristi format <strong>Best of 3</strong> — serija završava kad ekipa osvoji 2 utakmice. Pobjednik automatski prolazi u sljedeću rundu.</p>
        <p>Za svaku utakmicu u seriji: <em>+ Dodaj utakmicu u seriju</em> → unesi rezultat.</p>
        <p>Vizualni bracket (s linijama connectora) dostupan je i u adminu i na javnoj stranici (<code>/playoff</code>).</p>
      </Section>

      <Section title="⚠️ Česti problemi">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-foreground">Statistike se ne prikazuju na javnoj stranici</p>
            <p>Provjeri poklapaju li se zbroj bodova igrača s unesenim rezultatom utakmice. Dok se ne poklapaju, statistike su skrivene od javnosti.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Playoff bracket prikazuje "TBD" za ekipe</p>
            <p>Normalno — budući sudionici nisu poznati dok prethodne serije nisu završene. Ekipe se automatski popunjavaju.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Ne mogu dodati utakmicu između istih ekipa</p>
            <p>Sustav dozvoljava maksimalno 2 susreta između iste dvije ekipe. Treći nije moguć (uključujući playoff).</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Javna stranica ne prikazuje najnovije podatke</p>
            <p>Stranica je server-rendered — osvježi (F5) da vidiš ažurirane rezultate. Jedina iznimka su Live utakmice koje se ažuriraju automatski.</p>
          </div>
        </div>
      </Section>
    </div>
  )
}
