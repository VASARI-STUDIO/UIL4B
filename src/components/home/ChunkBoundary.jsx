import { Component } from 'react'
import { isChunkLoadError } from '../../utils/lazyRoute'

// A BOUNDARY FOR ONE LAZY PIECE OF THE HOMEPAGE.
//
// The hero loop and each below-the-fold section load as chunks of their own.
// When one of them cannot download (offline, a blocker, a chunk a redeploy
// removed), the page still has its headline, links and search, so the failure
// stays where it happened: `fallback` takes the place of the piece that did not
// arrive, sized like it, and the route's error card never shows. Only a failed
// download is held here. An error thrown by code that did arrive goes on to the
// route's boundary, which reports it.
export default class ChunkBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (!isChunkLoadError(error)) throw error
    return this.props.fallback
  }
}
