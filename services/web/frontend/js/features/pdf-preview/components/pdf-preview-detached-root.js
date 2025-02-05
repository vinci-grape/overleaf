import ReactDOM from 'react-dom'
import PdfPreview from './pdf-preview'
import { ContextRoot } from '../../../shared/context/root-context'
import { Shortcuts } from './shortcuts'
import PdfPreviewDetachedRootSafariWarning from './pdf-preview-detached-root-safari-warning'

function PdfPreviewDetachedRoot() {
  return (
    <ContextRoot>
      <Shortcuts>
        <PdfPreviewDetachedRootSafariWarning />
        <PdfPreview />
      </Shortcuts>
    </ContextRoot>
  )
}

export default PdfPreviewDetachedRoot // for testing

const element = document.getElementById('pdf-preview-detached-root')
if (element) {
  ReactDOM.render(<PdfPreviewDetachedRoot />, element)
}
