%classpath add mvn org.knowm.xchart xchart 3.5.2
import org.knowm.xchart.CategoryChart
import org.knowm.xchart.CategoryChartBuilder
import java.awt.Color

// Create a chart.
chart = new CategoryChartBuilder().width(800).height(400).
  title("Histogram").xAxisTitle("Bin").yAxisTitle("Count").build()
chart.getStyler().setPlotGridVerticalLinesVisible(false).setOverlapped(true)

// Extract the counts and add them to the chart.
counts = []
for (value in histo)
  counts.add(value.getRealDouble())
chart.addSeries("histogram", (0..counts.size()-1), counts).setFillColor(new java.awt.Color(0x7989FF))

chart
