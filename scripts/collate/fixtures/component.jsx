/* 阴性对照 (刊例第四十三条) — JS/JSX-side (camelCase / inline-style) branch of
   the same detectors already covered by fixtures/violations.css. Never
   scanned in a normal run (see note in violations.css). Not real UI. */
export function FixtureWidget() {
  return (
    <div
      style={{
        color: '#ff00aa',
        background: 'rgba(10, 20, 30, 0.5)',
        borderRadius: 999,
        transition: 'width 150ms, height 150ms',
        backdropFilter: 'blur(12px)',
        animationName: 'elasticPopFixture',
        fontSize: 13,
      }}
      className="text-[13px]"
    >
      fixture
    </div>
  )
}
