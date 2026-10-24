"""Run the v1.3 suite after the existing asynchronous roster renderer settles.
No application timers or rendering functions are replaced. This is a test-only
entrypoint that retains every original assertion and also checks labelled cards.
"""
import test_design_code_v13 as suite

capture_original = suite.capture


def capture_settled(page, label, targets=()):
    if label.endswith('-live-responses'):
        table = page.locator('#rzV13SimulationStudentResults table.rz-v15-compact-table').first
        table.wait_for(state='visible', timeout=10000)
        page.wait_for_function("""() => {
          const t = document.querySelector('#rzV13SimulationStudentResults table.rz-v15-compact-table');
          return t && [...t.querySelectorAll('tbody tr:first-child td')].every(n => n.dataset.rzLabel);
        }""", timeout=10000)
        suite.check(label + ' settled labelled response cards', table.locator('tbody tr:first-child td[data-rz-label]').count() >= 3)
        if page.viewport_size['width'] < 600:
            columns = table.locator('tbody tr').first.evaluate('(n) => getComputedStyle(n).gridTemplateColumns.split(" ").length')
            suite.check(label + ' mobile response card uses at most two columns', columns <= 2, columns)
    return capture_original(page, label, targets)


suite.capture = capture_settled
if __name__ == '__main__':
    suite.main()
